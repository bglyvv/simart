using MediatR;

namespace SimartBackend.Application.Habits.Queries.GetChildXp;

/// <summary>Returns the child's real, authoritative total XP (the same
/// XpTransaction ledger sum RedeemRewardCommand/DonateCommand already check
/// server-side when spending) — lets the frontend reconcile its own local,
/// optimistically-updated xp display against the ledger, instead of trusting
/// a number that can drift from what a spend attempt actually checks.</summary>
public sealed record GetChildXpQuery(Guid CallerFamilyId, Guid ChildId) : IRequest<int>;
