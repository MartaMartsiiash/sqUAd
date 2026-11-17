# Games

Every game is one class in `backend/app/games/` and one screen in
`frontend/src/games/`. They follow the contract in PROJECT.md, section 5.

| Game | Type | Players | How it works | Points |
|---|---|---|---|---|
| 🕵️ Шпигун | free | 3+ | Everyone sees the same place, except the spy. Ask questions, then vote. | Spy caught: +1 to everyone else, the spy may guess the place for +2. Not caught: spy +3 |
| 👉 Хто з нас...? | free | 3+ | "Who of us would most likely…?" Everyone votes secretly. | +1 for voting with the majority |
| 🧠 Асоціації | free | 3+ | One word; everyone writes their first association in 30 s. | +1 for every other player who wrote the same |
| 🤥 Правда чи брехня | free | 3+ | Each writes two truths and a lie about themselves; others find the lie. | +1 for finding the lie; the author +1 per fooled player |
| 🎭 Хто я? | premium | 3+ | You see everyone's character but your own; ask yes/no questions. | Earlier guess, more points |
| 💛 Квіз про друзів | premium | 3+ | The round's subject secretly picks "море чи гори?"; others guess. | +1 for a right guess; subject +1 if half guessed right |

## Adding a game
1. `backend/app/games/<name>.py`: a class that inherits `Game` and implements
   `start`, `act`, `tick`, `view`.
2. Register it in `backend/app/games/registry.py`.
3. `frontend/src/games/<Name>.tsx`: the screen; add it to `SCREENS` in
   `frontend/src/pages/Room.tsx`.
4. A test in `backend/tests/test_games.py`.
