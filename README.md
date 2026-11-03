# Math Quest

A math practice app for Nathan (3rd grade) and Ethan (2nd grade), made for a tablet browser.

- One profile per kid on the same tablet. Each kid starts in their own grade but can open any grade.
- 29 skills from the Common Core grade 2 and 3 math standards (see `skills.js`).
- Rounds of 10 questions with a number keypad or big answer buttons, a hint after the first wrong try, streaks, and up to 3 stars per skill.
- Progress (stars, scores, missed facts) is saved in the tablet's browser, ready for the parent page.

## Run it

It's plain HTML, CSS and JavaScript with no build step. Open `index.html` in a browser, or serve the folder with any static host.

## Check the questions

```
node test/skills.test.js
```

Generates 2,000 questions per skill and checks every answer is valid.

## Add a grade

Add skills to the list in `skills.js` with a new `grade` number. A tab for that grade appears automatically.
