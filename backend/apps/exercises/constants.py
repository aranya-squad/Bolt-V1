# Minimum elapsed_ms before a submission is considered plausible.
# Behaviour by session kind (Wave 1 decision):
#   CLASSWORK / TIME_ATTACK — reject with 400; implausibly fast answers indicate automation.
#   All other kinds (ZEN, FLASH_CARDS, CUSTOM) — log-only; fast answers are normal in flash-card
#   and zen flows and rejection would penalise legitimate users.
MIN_ANSWER_MS = 200

# Kinds for which MIN_ANSWER_MS violations are REJECTED (not just logged).
# Flash Cards deliberately excluded: fast answer is the point of the mode.
ANTICHEAT_ENFORCE_KINDS = frozenset(["CLASSWORK", "TIME_ATTACK"])

# Maximum allowed session duration in seconds. ZEN mode passes 0 ("no limit").
MAX_SESSION_SECONDS = 3600

# Maximum number of attempts allowed per question per session.
# Prevents answer enumeration via repeated submissions to the same question index.
MAX_ATTEMPTS_PER_QUESTION = 3

# Sentinel submitted_answer value used by the frontend to signal a student skip.
# Never a valid numeric answer (no curriculum question expects -999999).
SKIP_ANSWER_SENTINEL = -999999
