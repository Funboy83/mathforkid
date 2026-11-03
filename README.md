# Math Quest

A math practice app for Nathan (3rd grade) and Ethan (2nd grade), made for a tablet browser.

- One profile per kid on the same tablet. Each kid starts in their own grade but can open any grade.
- 29 skills from the Common Core grade 2 and 3 math standards (see `skills.js`).
- Rounds of 10 questions with a number keypad or big answer buttons, a hint after the first wrong try, streaks, and up to 3 stars per skill.
- Progress (stars, scores, missed facts) is saved in the tablet's browser, ready for the parent page.

## Teaching approach

- **Type the answer, don't pick it.** Arithmetic, word problems, rounding and clock reading use a number keypad, because recalling an answer builds memory better than recognizing it (retrieval practice and the generation effect). Multiple choice is kept for symbols and pictures that are hard to type: >, <, =, odd/even, fractions and shape names.
- **Spaced review.** A question a kid misses comes back in a later round (every 3rd question), and leaves the review list once they get it right first try.
- **Mastery before moving on.** A skill is mastered after two rounds of 9 or 10 out of 10. The next unmastered skill in the kid's grade is marked "Next up", but every skill stays open.
- **Mixed review.** Each grade has a tile that mixes questions from skills the kid has already practiced (interleaving).
- **Hint, then the answer.** The first wrong try shows a hint; the second shows the answer with the explanation.

## Run it

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or serve the folder with any static host.

## Check the questions

```
node test/skills.test.js
```

Generates 2,000 questions per skill and checks every answer is valid.

## Add a grade

Add skills to the list in `skills.js` with a new `grade` number. A tab for that grade appears automatically.
