# Games

Every room plays **2 games for free** (a repeat of the same game counts as a
new one). A donation of 50 UAH with the room code in the comment unlocks every
game and every repeat in that room until it closes (see docs/adr/0003).

Every game is one class in `backend/app/games/` and one screen in
`frontend/src/games/`. They follow the contract in PROJECT.md, section 5.

| Game | Players | How it works | Points |
|---|---|---|---|
| Хто з нас...? | 3+ | "Who of us would most likely…?" Everyone votes secretly. | +1 for voting with the majority |
| Ні так, ні ні | 3+ | Ni Oui Ni Non: each player in turn answers questions for 2 minutes without "так", "ні" and their synonyms (highlighted as forbidden). The others get provocative questions on their phones and press "Попався!". | +1 per 30 s survived; +1 to whoever caught them |
| Шпигун | 3+ | Everyone sees the same place, except the spy. Ask questions, then vote. | Spy caught: +1 to everyone else, the spy may guess the place for +2. Not caught: spy +3 |
| Асоціації | 3+ | One word; everyone writes their first association in 30 s. | +1 for every other player who wrote the same |
| Правда чи брехня | 3+ | Each writes two truths and a lie about themselves; others find the lie. | +1 for finding the lie; the author +1 per fooled player |
| Забуті слова | 3+ | An old or regional Ukrainian word (бамбетель, шпихлір, кнайпа…). Everyone invents a believable meaning, then all vote for the real one. | +2 for finding the real meaning; +1 per player fooled by your invention |
| Хто я? | 3+ | You see everyone's character but your own; ask yes/no questions. | Earlier guess, more points |
| Квіз про друзів | 3+ | The round's subject secretly picks "море чи гори?"; others guess. | +1 for a right guess; subject +1 if half guessed right |

## Adding a game
1. `backend/app/games/<name>.py`: a class that inherits `Game` and implements
   `start`, `act`, `tick`, `view`.
2. Register it in `backend/app/games/registry.py`.
3. `frontend/src/games/<Name>.tsx`: the screen; add it to `SCREENS` in
   `frontend/src/pages/Room.tsx`.
4. A test in `backend/tests/test_games.py`.
