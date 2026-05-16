import json
import logging
from dataclasses import dataclass
from typing import Optional

from groq import AsyncGroq

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SCORE_PROMPT_TEMPLATE = """
You are an expert job-fit evaluator. Your task is to assess how well a candidate profile matches a job description.

## Candidate Profile
- **Name**: {name}
- **Title**: {title}
- **Summary**: {summary}
- **Skills**: {skills}
- **Experience Years**: {experience_years}
- **Languages**: {languages}
{cv_section}

## Job Post
- **Title**: {job_title}
- **Company**: {company}
- **Location**: {location}
- **Description**:
{description}

## Your Task
Evaluate the fit between the candidate and this job. Return a JSON object with exactly these fields:
{{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap 1>", "<gap 2>", ...]
}}

Rules:
- score 80-100: Excellent match — candidate is highly qualified
- score 60-79: Good match — candidate meets most requirements
- score 40-59: Partial match — some relevant experience but notable gaps
- score 0-39: Poor match — significant skill or experience mismatch
- Be concise, objective, and base your assessment only on the provided data.
- strengths and gaps should each have 2-4 items max.
- Return ONLY valid JSON, no markdown, no explanation.
"""


@dataclass
class ScoreResult:
    score: int
    summary: str
    strengths: list[str]
    gaps: list[str]


class AIScorer:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not configured")
        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def score_job(
        self,
        job_title: str,
        company: str,
        location: Optional[str],
        description: str,
        candidate_name: str,
        candidate_title: Optional[str],
        candidate_summary: Optional[str],
        candidate_skills: list[str],
        candidate_experience_years: Optional[int],
        candidate_languages: list[str],
        candidate_cv_text: Optional[str] = None,
    ) -> ScoreResult:
        cv_section = ""
        if candidate_cv_text:
            cv_section = f"- **CV / Resume**:\n{candidate_cv_text[:3000]}"

        prompt = SCORE_PROMPT_TEMPLATE.format(
            name=candidate_name,
            title=candidate_title or "Not specified",
            summary=candidate_summary or "Not specified",
            skills=", ".join(candidate_skills) if candidate_skills else "Not specified",
            experience_years=candidate_experience_years or "Not specified",
            languages=", ".join(candidate_languages) if candidate_languages else "Not specified",
            cv_section=cv_section,
            job_title=job_title,
            company=company,
            location=location or "Not specified",
            description=description[:4000] if description else "No description available",
        )

        try:
            response = await self._client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=600,
                response_format={"type": "json_object"},  # supported on llama-3.3-70b-versatile
            )
            raw = response.choices[0].message.content
            data = json.loads(raw)
            return ScoreResult(
                score=int(data.get("score", 0)),
                summary=data.get("summary", ""),
                strengths=data.get("strengths", []),
                gaps=data.get("gaps", []),
            )
        except Exception as e:
            logger.error("AI scoring failed for job '%s': %s", job_title, e)
            return ScoreResult(score=0, summary=f"Evaluation failed: {e}", strengths=[], gaps=[])
