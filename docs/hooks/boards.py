from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from mkdocs.config.defaults import MkDocsConfig


BOARD_FILENAME = "board.json"
BOARD_PAGE_FILENAME = "index.md"

SUPPORTED_IMAGES = (
    "image.webp",
    "image.png",
    "image.jpg",
    "image.jpeg",
)

OUTPUT_RELATIVE_PATH = Path("assets/data/boards.json")


def load_board(board_file: Path, boards_root: Path) -> dict[str, Any]:
    """Прочитать и проверить описание одной платы."""

    try:
        with board_file.open("r", encoding="utf-8") as file:
            board = json.load(file)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"Некорректный JSON в {board_file}: "
            f"строка {error.lineno}, столбец {error.colno}: {error.msg}"
        ) from error

    if not isinstance(board, dict):
        raise RuntimeError(
            f"{board_file} должен содержать JSON-объект, а не массив."
        )

    required_fields = (
        "name",
        "fpga_vendor",
        "fpga_family",
    )

    missing_fields = [
        field for field in required_fields
        if not board.get(field)
    ]

    if missing_fields:
        raise RuntimeError(
            f"В {board_file} отсутствуют обязательные поля: "
            f"{', '.join(missing_fields)}"
        )

    board_directory = board_file.parent
    slug = board_directory.relative_to(boards_root).as_posix()

    external_page = board.pop("external_page", None)
    external_image = board.pop("external_image", None)

    if external_page:
        if not isinstance(external_page, str):
            raise RuntimeError(
                f"Поле external_page в {board_file} должно быть строкой."
            )

        if not external_page.startswith(("https://", "http://")):
            raise RuntimeError(
                f"Поле external_page в {board_file} должно содержать "
                f"полный URL с http:// или https://"
            )

        board["page"] = external_page
        board["page_external"] = True

    else:
        page_file = board_directory / BOARD_PAGE_FILENAME

        if not page_file.exists():
            raise RuntimeError(
                f"Для платы {board['name']} отсутствует страница "
                f"{page_file}. Либо создайте index.md, либо укажите "
                f"external_page в {board_file}."
            )

        board["page"] = f"/boards/{slug}/"
        board["page_external"] = False

    if external_image:
        if not isinstance(external_image, str):
            raise RuntimeError(
                f"Поле external_image в {board_file} должно быть строкой."
            )

        if not external_image.startswith(("https://", "http://")):
            raise RuntimeError(
                f"Поле external_image в {board_file} должно содержать "
                f"полный URL с http:// или https://"
            )

        board["image"] = external_image
        board["image_external"] = True

    else:
        image_path = next(
            (
                board_directory / image_name
                for image_name in SUPPORTED_IMAGES
                if (board_directory / image_name).exists()
            ),
            None,
        )

        if image_path is not None:
            board["image"] = (
                f"/boards/{slug}/{image_path.name}"
            )
        else:
            board["image"] = ""

        board["image_external"] = False

    return board


def generate_boards_json(config: MkDocsConfig) -> None:
    """Объединить все board.json в один JSON для Tabulator."""

    docs_dir = Path(config.docs_dir)
    boards_root = docs_dir / "boards"
    output_file = docs_dir / OUTPUT_RELATIVE_PATH

    if not boards_root.exists():
        raise RuntimeError(
            f"Каталог с платами не найден: {boards_root}"
        )

    board_files = sorted(
        boards_root.rglob(BOARD_FILENAME)
    )

    if not board_files:
        raise RuntimeError(
            f"В {boards_root} не найдено ни одного {BOARD_FILENAME}"
        )

    boards = [
        load_board(board_file, boards_root)
        for board_file in board_files
    ]

    # Проверка уникальности названий и URL.
    names: set[str] = set()
    pages: set[str] = set()

    for board in boards:
        name = board["name"]
        page = board["page"]

        if name in names:
            raise RuntimeError(
                f"Повторяющееся название платы: {name}"
            )

        if page in pages:
            raise RuntimeError(
                f"Повторяющийся URL платы: {page}"
            )

        names.add(name)
        pages.add(page)

    boards.sort(
        key=lambda item: item["name"].casefold()
    )

    output_file.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(
            boards,
            file,
            ensure_ascii=False,
            indent=2,
        )
        file.write("\n")

    print(
        f"[boards] Собрано плат: {len(boards)}; "
        f"файл: {output_file}"
    )


def on_config(config: MkDocsConfig) -> MkDocsConfig:
    """
    MkDocs hook.

    Вызывается до обработки файлов документации.
    """

    generate_boards_json(config)
    return config