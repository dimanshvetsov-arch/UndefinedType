/* Shared word-locking rules for solo, multiplayer, and server validation.
 * Only COMPLETE and CORRECT words are locked. Incomplete words and
 * misspelled words may always be corrected until a later correct word locks.
 */
(function (root, factory) {
  const rules = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = rules;
  if (root) root.UndefinedTypeRules = rules;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function deletionFloor(value, reference) {
    let floor = 0, start = 0;
    while (start < reference.length && start < value.length) {
      const separator = reference.indexOf(' ', start);
      const end = separator === -1 ? reference.length : separator;
      if (value.length < end) break; // incomplete words are NEVER locked
      if (value.slice(start, end) === reference.slice(start, end)) {
        floor = end; // the last letter of a fully correct word is locked
        if (reference[end] === ' ' && value[end] === ' ') floor = end + 1;
      }
      if (separator === -1) break;
      start = separator + 1;
    }
    return floor;
  }
  function currentWordStart(value) {
    const end = value.endsWith(' ') ? value.length - 1 : value.length;
    return value.lastIndexOf(' ', end - 1) + 1;
  }
  function backspaceTarget(value, reference, byWord = false) {
    if (!value) return null;
    const target = byWord ? currentWordStart(value) : value.length - 1;
    return target >= deletionFloor(value, reference) ? target : null;
  }
  function validDeletion(before, after, reference) {
    if (after.length >= before.length) return false;
    const oneLetter = after === before.slice(0, -1);
    const wholeWord = after === before.slice(0, currentWordStart(before));
    return (oneLetter || wholeWord) && after.length >= deletionFloor(before, reference);
  }
  return Object.freeze({ deletionFloor, currentWordStart, backspaceTarget, validDeletion });
});
