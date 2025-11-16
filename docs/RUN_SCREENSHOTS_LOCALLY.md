# Run screenshots locally with Laragon

Purpose:
- Quick instructions to start Laragon and run the Playwright screenshot runner for Visual QA

Steps:
1. Start Laragon
   - Open the Laragon app and click "Start All" (or Start Apache/Nginx + MySQL as needed).

2. Confirm project URL
   - If the project is placed under Laragon's www (e.g. d:/Software/Ekstrak/laragon/www/Filemanager), use:
     http://localhost/Filemanager
   - If you configured a virtual host (e.g. filemanager.test) use that hostname instead.

3. Ensure Node and Playwright are installed
   - From project root run:
     npm install
     npx playwright install

4. Run the screenshot script
   - Windows CMD:
     set "BASE_URL=http://localhost/Filemanager" && node tools/screenshot.js
   - PowerShell:
     $env:BASE_URL="http://localhost/Filemanager"; node tools/screenshot.js
   - Note: DEFAULT BASE_URL is http://localhost:8000 if you don't set it (the script falls back to that).

5. Output
   - Screenshots are saved to ./screens/baseline/

Troubleshooting:
- If overlays don't appear, ensure you have data in the UI and open the overlays manually (or triggers are visible) before running.
- If Playwright browsers are missing, run `npx playwright install` again.
- If Node is not installed, install Node.js (LTS) first.

Next steps:
- Run the command above in your Laragon environment and paste the path to ./screens/baseline when finished so I can prepare prioritized CSS fixes and patch diffs.