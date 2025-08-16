# 🏦 Bitcoin Treasury Allocation Simulator

**Bitcoin Treasury Allocation Simulator** is an open-source tool that helps businesses explore treasury strategies inspired by MicroStrategy’s Bitcoin model — normalized for any company size.  

It models:
- Revenue & expenses
- Risk appetite
- Runway targets
- Market volatility
- Debt capacity

And outputs:
- Recommended BTC allocation (% + USD cap)
- Buy-in strategy (tranches vs. DCA)
- Custody policy suggestion
- Accounting notes (GAAP / IFRS)

---

## 🚀 Getting Started

1. Clone repo  
```bash
git clone https://github.com/yourusername/treasury-allocation-simulator.git
cd treasury-allocation-simulator

```
## Install dependencies

npm install

Run dev server

npm run dev


Open http://localhost:5173 in your browser.

##📂 Repo Layout
```
/src/components → Core UI (e.g. TreasurySimulatorPage.jsx)
/src/utils → Calculation models (risk score, allocation tiers, GAAP/IFRS notes)
/docs → Background methodology, citations
/tests → Jest/RTL tests for calculations
```
##🛡️ Disclaimer

This tool is for educational purposes only.
It is not financial advice, not investment solicitation, and not affiliated with Strategy™ (MicroStrategy).

Always consult a CPA or financial advisor before making treasury decisions.

##📜 License

MIT © 2025 bitcoinforengineers.com
