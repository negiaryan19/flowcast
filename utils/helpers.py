"""Small formatting helpers shared by future report commands."""


def humanize_model_name(value: str) -> str:
    return value.replace("_", " ").title()
