// The number check of tools/make-audio-fs.mjs --verify: a take that keeps high similarity can still lose a number word.
import assert from 'node:assert';
import { numberWords, numbersMatch, numberCheck } from '../tools/make-audio-fs.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(numberWords('Ағай, мінеки, екі мың теңге.').join(' ') === 'екі мың', 'two words in order');
ok(numberWords('Бір келі — бес жүз теңге.').join(' ') === 'бір бес жүз', 'бір counts too');
ok(!numbersMatch('Екі мың теңге, мінеки.', 'Мың теңге, мінекий!'), '2000 heard as 1000 is caught (the 21.11 take)');
ok(numbersMatch('Ағай, мінеки, екі мың теңге.', 'Ағай, мінекей, екі мың теңге!'), 'spelling of other words does not matter');
ok(numbersMatch('Маған үш келі алма беріңізші.', 'Маған 3 келі алма беріңізші') === false, 'a digit is not the same as the word (ASR must write words)');
ok(numbersMatch('Сәлеметсіз бе!', 'Сәлеметсіз бе'), 'no numbers — match');
ok(numberCheck('1991 жылы', 'Мың тоғыз жүз тоқсан бірінші жылы') === 'digits', 'digits in the text go to a manual check');
ok(numberCheck('Ағай, мінеки, екі мың теңге.', 'Ағай, мың теңге') === 'WRONG', 'a lost number is WRONG');
console.log('fs numbers check: ' + n + ' checks passed');
