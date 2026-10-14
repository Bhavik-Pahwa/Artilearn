import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AsyncState, EmptyState, Field, PageHeader, StatusMessage } from "../../components/ui";
import { useApiResource } from "../../hooks/useApiResource";
import { api, jsonBody } from "../../lib/api";
import type { Assessment, AssessmentAttempt, Notebook } from "../../shared/domain";
import { formatDateTime } from "../../shared/format";
import { routes } from "../../shared/routes";

type PublicAssessment = Omit<Assessment, "questions"> & { questions: Array<Pick<Assessment["questions"][number], "id" | "prompt" | "options">> };
type ResultPayload = { attempt: AssessmentAttempt; assessment: Assessment };
const emptyAssessment = { questions: [] } as unknown as PublicAssessment;

export function AssessmentsPage() {
  const assessments = useApiResource<PublicAssessment[]>("/assessments", []); const attempts = useApiResource<AssessmentAttempt[]>("/attempts", []);
  return <><PageHeader eyebrow="Practice and feedback" title="Quizzes" description="Create a short assessment, submit once, then review explanations." action={<Link className="primary-button" to={routes.quizNew}>Create quiz</Link>} /><AsyncState loading={assessments.loading} error={assessments.error}>{assessments.data.length ? <div className="card-grid">{assessments.data.map((assessment) => { const latest = attempts.data.find((attempt) => attempt.assessmentId === assessment.id); return <Link className="entity-card" to={routes.quiz(assessment.id)} key={assessment.id}><span className="card-kicker">{assessment.questions.length} questions · {assessment.durationMinutes} min</span><h2>{assessment.title}</h2><p>{latest ? `Latest score: ${latest.score}%` : "Ready to begin"}</p><span className="card-cta">{latest ? "Try again" : "Start quiz"} →</span></Link>; })}</div> : <EmptyState title="No quizzes yet" action={<Link className="primary-button" to={routes.quizNew}>Create your first quiz</Link>}>Generate a transparent demo assessment to practice the full attempt and review flow.</EmptyState>}</AsyncState></>;
}

export function AssessmentCreatePage() {
  const navigate = useNavigate(); const [params] = useSearchParams(); const notebooks = useApiResource<Notebook[]>("/notebooks", []); const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); try { const created = await api<PublicAssessment>("/assessments", { method: "POST", ...jsonBody({ title: form.get("title"), notebookId: form.get("notebookId") || undefined }) }); navigate(routes.quiz(created.id)); } catch (reason) { setStatus(reason instanceof Error ? reason.message : "Unable to create quiz."); } }
  return <><PageHeader eyebrow="Assessment setup" title="Create a quiz" description="This prototype creates a three-question study-methods quiz and never exposes answer keys before submission." /><form className="panel stack-form compact-form" onSubmit={submit}><span className="demo-badge">Demo question set</span><Field label="Quiz title"><input name="title" required maxLength={100} placeholder="Weekly retrieval practice" /></Field><Field label="Notebook (optional)"><select name="notebookId" defaultValue={params.get("notebook") ?? ""}><option value="">No notebook</option>{notebooks.data.map((notebook) => <option key={notebook.id} value={notebook.id}>{notebook.title}</option>)}</select></Field><button className="primary-button">Create and start</button><StatusMessage>{status}</StatusMessage></form></>;
}

export function AssessmentAttemptPage() {
  const { id = "" } = useParams(); const navigate = useNavigate(); const resource = useApiResource<PublicAssessment>(`/assessments/${id}`, emptyAssessment); const [status, setStatus] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const answers: Record<string, number> = {}; resource.data.questions.forEach((question) => { const value = form.get(question.id); if (value !== null) answers[question.id] = Number(value); }); if (Object.keys(answers).length !== resource.data.questions.length) { setStatus("Answer every question before submitting."); return; } try { const result = await api<ResultPayload>(`/assessments/${id}/attempts`, { method: "POST", ...jsonBody({ answers }) }); navigate(routes.quizResults(id, result.attempt.id)); } catch (reason) { setStatus(reason instanceof Error ? reason.message : "Unable to submit quiz."); } }
  return <AsyncState loading={resource.loading} error={resource.error}><PageHeader eyebrow={`${resource.data.durationMinutes} minute practice`} title={resource.data.title} description="Choose one answer for each question. Your score is calculated on the server." /><form className="quiz-form" onSubmit={submit}>{resource.data.questions.map((question, index) => <fieldset className="panel question-card" key={question.id}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label className="option" key={option}><input type="radio" name={question.id} value={optionIndex} /> <span>{option}</span></label>)}</fieldset>)}<StatusMessage>{status}</StatusMessage><button className="primary-button">Submit quiz</button></form></AsyncState>;
}

export function AssessmentResultsPage() {
  const [params] = useSearchParams(); const attemptId = params.get("attempt") ?? "";
  const resource = useApiResource<ResultPayload>(`/attempts/${encodeURIComponent(attemptId)}`, {} as ResultPayload);
  return <AsyncState loading={resource.loading} error={resource.error}>{resource.data.attempt && <><PageHeader eyebrow="Quiz complete" title={`${resource.data.attempt.score}%`} description={`Submitted ${formatDateTime(resource.data.attempt.submittedAt ?? resource.data.attempt.startedAt)}`} /><div className="review-list">{resource.data.assessment.questions.map((question) => { const selected = resource.data.attempt.answers[question.id]; const correct = selected === question.correctOptionIndex; return <section className="panel" key={question.id}><span className={correct ? "result-pill correct" : "result-pill incorrect"}>{correct ? "Correct" : "Review"}</span><h2>{question.prompt}</h2><p>Your answer: <strong>{question.options[selected] ?? "No answer"}</strong></p>{!correct && <p>Correct answer: <strong>{question.options[question.correctOptionIndex]}</strong></p>}<p className="explanation">{question.explanation}</p></section>; })}</div><Link className="secondary-button" to={routes.quizzes}>Back to quiz history</Link></>}</AsyncState>;
}
