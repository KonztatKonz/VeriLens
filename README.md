# VeriLens
VeriLens, a web application created for research dedicated to detecting AI generated images whilst providing a quiz to see how well you do.

## Render setup

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render will read `render.yaml` and create the `verilens` web service.
4. Open the service's **Environment** page.
5. Set `API_KEYS` to your comma-separated API keys, for example:

   ```text
   aion_prod_first_key,aion_prod_second_key
   ```

6. Save the environment variable. Render will redeploy the service.

Do not commit `.env` or paste real API keys into `render.yaml`, source code, or documentation. Render supplies `PORT` automatically, so a `PORT` variable is not required.

For local development, copy `.env.example` to `.env`, replace the placeholder with real keys, and run:

```powershell
npm start
```
