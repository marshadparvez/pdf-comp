from pathlib import Path

import fitz


def create_pdf(path: Path, lines: list[str]) -> None:
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for line in lines:
        page.insert_text((72, y), line, fontsize=12)
        y += 20
    doc.save(path)
    doc.close()


def main() -> None:
    output_dir = Path(__file__).resolve().parent
    old_pdf = output_dir / "sample_old.pdf"
    new_pdf = output_dir / "sample_new.pdf"

    create_pdf(
        old_pdf,
        [
            "Invoice #001",
            "Amount: $100",
            "Due Date: 2024-01-10",
            "Thank you for your business.",
        ],
    )

    create_pdf(
        new_pdf,
        [
            "Invoice #001",
            "Amount: $150",
            "Due Date: 2024-01-15",
            "Thank you for your business.",
            "Notes: Updated amount and due date.",
        ],
    )

    print(f"Created {old_pdf} and {new_pdf}")


if __name__ == "__main__":
    main()
