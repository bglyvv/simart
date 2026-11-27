/** Where a logged-in family enters the app: add-child until there's a child,
 *  the family gate after that. null when nobody is logged in on this device. */
export function appEntryPath(hasParent: boolean, childCount: number): string | null {
  if (!hasParent) return null;
  return childCount === 0 ? '/usaq-elave-et' : '/aile-qapisi';
}
