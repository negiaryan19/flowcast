# FlowCast manual tasks

These tasks need project-owner or mentor decisions. They do not block continued local development of the approved core.

## Mentor review

1. Share `MENTOR_REVIEW_REPORT.md` with the Intermo mentor.
2. Confirm whether the one-month core may focus on evaluated traffic-volume forecasting and a 3D historical dashboard.
3. Confirm whether a public US dataset is acceptable or an Indian/local dataset is required.
4. Ask whether congestion, travel time and accident risk are mandatory for the final assessment.
5. Ask for the required report format, deployment target and weekly review time.

Record the mentor's response in the roadmap before changing the prediction scope.

## GitHub

1. Confirm that `negiaryan68487@gmail.com` is connected to the GitHub account if contribution attribution matters.
2. Review the commits on `codex/one-month-build`.
3. Review [draft PR #6](https://github.com/negiaryan19/flowcast/pull/6); the branch has been pushed.
4. Backend and frontend checks passed for `cd3f0b0`. Check the latest PR checks before marking it ready and merging. Merge into the default branch is a separate review decision; feature-branch commits alone do not guarantee profile contribution credit.

## Deployment

Choose a host after the mentor confirms requirements. The current project needs a Python API capable of loading the model artifact and a static frontend configured with `VITE_API_URL`. Record the chosen service, region, cost limit and public/private access requirement before adding deployment credentials.

Never commit API keys, provider tokens, `.env` files, downloaded raw data or private customer data.

## Final submission

1. Retrain the model and retain the generated metrics from the final commit.
2. Capture desktop and mobile screenshots from the running application.
3. Record a two-to-three minute demonstration covering the problem, source data, model comparison, API and 3D dashboard.
4. State implemented, partial and deferred original requirements separately.
5. Add the repository link, commit or release tag, setup commands and test evidence to the submitted report.
