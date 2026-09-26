export function normalizePatientRm(rm: string): string {
  return rm.trim().toLowerCase();
}

export function isSamePatientIdentity(
  leftRotationId: string,
  leftRm: string,
  rightRotationId: string,
  rightRm: string,
): boolean {
  return (
    leftRotationId === rightRotationId &&
    normalizePatientRm(leftRm) === normalizePatientRm(rightRm)
  );
}
