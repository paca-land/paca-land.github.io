# English word list

`words_alpha.txt` is dwyl's English word list ([github.com/dwyl/english-words](https://github.com/dwyl/english-words), `words_alpha.txt`), released into the public domain under the Unlicense.

It's trimmed to words of 2 to 14 letters (the lengths Drift accepts), with Unix line endings: 350,193 words. Drift (`js/lexicon.js`) fetches it when a voyage starts, so the sky only accepts real English words. Drift's own words and a few modern ones the list lacks (emoji, wifi, selfie…) are added in `lexicon.js`.
