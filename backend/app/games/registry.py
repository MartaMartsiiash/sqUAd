"""All games in one place. To add a game: write the class, add it here."""

from app.domain.room import DomainError
from app.games.associations import Associations
from app.games.base import Game
from app.games.friends_quiz import FriendsQuiz
from app.games.spy import Spy
from app.games.two_truths import TwoTruths
from app.games.who_am_i import WhoAmI
from app.games.who_of_us import WhoOfUs

GAMES: dict[str, Game] = {
    g.id: g for g in [Spy(), WhoOfUs(), Associations(), TwoTruths(), WhoAmI(), FriendsQuiz()]
}


def get_game(game_id: str) -> Game:
    try:
        return GAMES[game_id]
    except KeyError:
        raise DomainError("game_not_found", "Такої гри немає", 404) from None


def all_games() -> list[dict]:
    return [g.meta() for g in GAMES.values()]
