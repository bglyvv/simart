using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SimartBackend.Domain.Common;
using AdminEntity = SimartBackend.Domain.Entities.Admin.Admin;
using SimartBackend.Domain.Entities.Content;
using SimartBackend.Domain.Entities.Economy;
using SimartBackend.Domain.Entities.Focus;
using SimartBackend.Domain.Entities.Games;
using SimartBackend.Domain.Entities.Habits;
using SimartBackend.Domain.Entities.Identity;
using SimartBackend.Domain.Entities.Partners;
using SimartBackend.Domain.Entities.Social;

namespace SimartBackend.Infrastructure.Persistence;

public class SimartDbContext(DbContextOptions<SimartDbContext> options) : DbContext(options)
{
    public DbSet<AdminEntity> Admins => Set<AdminEntity>();

    public DbSet<Family> Families => Set<Family>();
    public DbSet<Parent> Parents => Set<Parent>();
    public DbSet<Child> Children => Set<Child>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    public DbSet<HabitCategory> HabitCategories => Set<HabitCategory>();
    public DbSet<HabitTask> HabitTasks => Set<HabitTask>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();

    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<WatchProgress> WatchProgresses => Set<WatchProgress>();

    public DbSet<FocusSession> FocusSessions => Set<FocusSession>();
    public DbSet<ScreenTimeEntry> ScreenTimeEntries => Set<ScreenTimeEntry>();

    public DbSet<Game> Games => Set<Game>();
    public DbSet<GameResult> GameResults => Set<GameResult>();

    public DbSet<XpTransaction> XpTransactions => Set<XpTransaction>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<RewardRedemption> RewardRedemptions => Set<RewardRedemption>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<DonationCampaign> DonationCampaigns => Set<DonationCampaign>();

    public DbSet<SocialPost> SocialPosts => Set<SocialPost>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<SocialComment> SocialComments => Set<SocialComment>();
    public DbSet<CommentLike> CommentLikes => Set<CommentLike>();

    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<RewardProposal> RewardProposals => Set<RewardProposal>();
    public DbSet<RewardProposalEvent> RewardProposalEvents => Set<RewardProposalEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Every ISoftDeletable entity gets: a FK from deleted_by to admin.id, and a
        // global query filter that hides soft-deleted rows unless explicitly
        // ignored (IgnoreQueryFilters()) — e.g. for an admin "show deleted" view.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
                continue;

            modelBuilder.Entity(entityType.ClrType)
                .HasOne(typeof(AdminEntity))
                .WithMany()
                .HasForeignKey(nameof(ISoftDeletable.DeletedBy))
                .OnDelete(DeleteBehavior.Restrict);

            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var isDeletedProperty = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
            var notDeleted = Expression.Lambda(Expression.Not(isDeletedProperty), parameter);
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(notDeleted);
        }

        // Exactly one of child_id / parent_id is set on watch_progress — see the
        // ER diagram's design notes for why this is two real FKs, not a single
        // polymorphic source_type/source_id pair.
        modelBuilder.Entity<WatchProgress>().ToTable(t => t.HasCheckConstraint(
            "CK_watch_progress_exactly_one_viewer",
            "(child_id IS NOT NULL) <> (parent_id IS NOT NULL)"));

        modelBuilder.Entity<WatchProgress>()
            .HasOne(w => w.Child)
            .WithMany()
            .HasForeignKey(w => w.ChildId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<WatchProgress>()
            .HasOne(w => w.Parent)
            .WithMany()
            .HasForeignKey(w => w.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // social_comment references itself for threaded replies.
        modelBuilder.Entity<SocialComment>()
            .HasOne(c => c.ParentComment)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RewardRedemption>()
            .HasOne(r => r.ApprovedByParent)
            .WithMany()
            .HasForeignKey(r => r.ApprovedByParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Reward/DonationCampaign.PartnerId is optional (a catalog item with
        // no real-world partner yet never gets a Voucher — see Voucher's own
        // doc comment) — Restrict, same "don't cascade-delete a catalog
        // alongside an unrelated account" reasoning as every other optional
        // FK onto a catalog-ish table in this file.
        modelBuilder.Entity<Reward>()
            .HasOne<Partner>()
            .WithMany()
            .HasForeignKey(r => r.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DonationCampaign>()
            .HasOne<Partner>()
            .WithMany()
            .HasForeignKey(d => d.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        // A voucher's Code is what's actually encoded in the QR image and
        // typed/scanned by a partner — has to be unique to look one up at all.
        modelBuilder.Entity<Voucher>()
            .HasIndex(v => v.Code)
            .IsUnique();

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.Partner)
            .WithMany()
            .HasForeignKey(v => v.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RewardProposal>()
            .HasOne(p => p.Partner)
            .WithMany()
            .HasForeignKey(p => p.PartnerId)
            .OnDelete(DeleteBehavior.Restrict);

        // PublishedRewardId is optional (null until approved) and points at
        // the real catalog row this proposal became — Restrict, same
        // reasoning as every other optional FK onto a catalog-ish table.
        modelBuilder.Entity<RewardProposal>()
            .HasOne<Reward>()
            .WithMany()
            .HasForeignKey(p => p.PublishedRewardId)
            .OnDelete(DeleteBehavior.Restrict);

        // Deleting a proposal (never actually exposed anywhere — proposals
        // are never hard-deleted) takes its own event history with it.
        modelBuilder.Entity<RewardProposalEvent>()
            .HasOne(e => e.Proposal)
            .WithMany(p => p.Events)
            .HasForeignKey(e => e.ProposalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
