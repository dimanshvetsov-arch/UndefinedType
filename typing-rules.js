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
  // Friendly, high-frequency English words appear more often than the extra
  // vocabulary. The exact same selection rule runs in the client and server.
  const easyEnglishCore = Object.freeze("the and you that this with have from your when they some there water where about would could these those their what which then than were will more most very just like make good time take give come look want know think find many little right great much each even here only back over also day home school house world work word words game play phone book paper name food music friend family happy small big new old long short easy fast slow same nice best green blue red black white yellow brown color light dark sun moon rain snow river beach tree flower grass garden park animal dog cat bird fish apple banana orange fruit cake milk bread cheese egg rice soup coffee tea morning night today week year summer winter spring warm cold hot cool hand head face eye feet heart body smile laugh fun love people person dad mom baby boy girl child kids man woman hello yes no not can do did does doing done go get has had was is are be been walk run jump sit stand speak talk tell say see read write type test try use help keep learn start stop open close down up in on out to for at by an or if so it he she we me my our us his her of one two three four five six ten all first next last now still after before again other every always never often well better kind simple quick ask answer thing things place money room door window table chair bed desk pen key bag car bus train road city town street eat drink cook bake cup bowl plate glass spoon fork salt sugar song sound voice movie video photo page story line text letter number class teacher lesson math quiz score point win race speed typing skill clear wrong check fix turn move feel hope care share bring end rock stone sky cloud".split(' '));
  function choosePracticeWord(bank, language='en', randomValue=Math.random()) {
    if(!Array.isArray(bank)||!bank.length) return '';
    const r=Math.min(.999999999,Math.max(0,Number(randomValue)||0));
    if(language !== 'en') return bank[Math.floor(r*bank.length)];
    const commonShare=.68;
    if(r<commonShare) return easyEnglishCore[Math.floor(r/commonShare*easyEnglishCore.length)];
    return bank[Math.floor((r-commonShare)/(1-commonShare)*bank.length)];
  }
  return Object.freeze({ deletionFloor, currentWordStart, backspaceTarget, validDeletion, choosePracticeWord, easyEnglishCore });
});
