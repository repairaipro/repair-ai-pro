export const DIAGNOSTIC_KNOWLEDGE = {
  Plumbing: {
    commonIssues: [
      {
        name: "Dripping faucet",
        keywords: ["drip", "leak", "faucet", "tap", "water"],
        clarifyingQuestions: [
          "Is the water dripping from the spout or from under the sink?",
          "Is it hot water, cold water, or both?",
          "How many drops per second approximately?",
        ],
        diagnostics: {
          spout: "Worn cartridge or O-ring — $50-200 DIY or $150-400 pro",
          under: "Supply line leak or cartridge housing — $100-300 DIY or $300-600 pro",
        },
        difficulty: "Easy",
      },
      {
        name: "Running toilet",
        keywords: ["running", "toilet", "constantly", "water", "keeps"],
        clarifyingQuestions: [
          "Is the water running into the bowl or the overflow tube?",
          "When did this start?",
          "Have you recently replaced the fill valve or flapper?",
        ],
        diagnostics: {
          bowl: "Faulty flapper seal — $10-30 DIY or $150-300 pro",
          overflow: "Fill valve issue — $20-50 DIY or $200-400 pro",
        },
        difficulty: "Easy",
      },
      {
        name: "Low water pressure",
        keywords: ["pressure", "weak", "low", "flow", "reduced"],
        clarifyingQuestions: [
          "Is it low in one fixture or throughout the house?",
          "Is it both hot and cold water or just one?",
          "When did you first notice this?",
        ],
        diagnostics: {
          single: "Aerator clogged or cartridge issue — $5-50 DIY or $150-300 pro",
          whole: "Main valve issue or supply line problem — $100-500 DIY or $500-1500 pro",
        },
        difficulty: "Medium",
      },
    ],
    systemPrompt: `You are an expert plumber diagnosing home water issues.
Use evidence-based diagnosis:
- Ask clarifying questions about location (kitchen/bathroom), water type (hot/cold), and behavior
- Never assume — water issues have distinct patterns
- Distinguish between supply-side (incoming) and drain-side (outgoing) problems
- Consider water quality, pressure, and flow rate
- Be precise about part names and replacement costs`,
  },

  HVAC: {
    commonIssues: [
      {
        name: "AC not cooling",
        keywords: ["cooling", "cool", "ac", "air", "cold", "temperature"],
        clarifyingQuestions: [
          "Is the compressor running (outdoor unit making noise)?",
          "Are the vents blowing warm or room-temperature air?",
          "When was the last filter change?",
          "Any hissing or unusual sounds?",
        ],
        diagnostics: {
          "compressor-off": "Thermostat, capacitor, or electrical — $200-800",
          "warm-air": "Low refrigerant, compressor issue, or outdoor coil problem — $500-2000",
        },
        difficulty: "Hard",
      },
      {
        name: "Furnace not heating",
        keywords: ["heat", "heating", "warm", "furnace", "cold"],
        clarifyingQuestions: [
          "Is the blower running but no heat, or nothing at all?",
          "Did you check the thermostat is set correctly?",
          "When was the last maintenance?",
          "Hear any clicking or error sounds?",
        ],
        diagnostics: {
          "no-blower": "Ignitor, thermostat, or gas valve — $300-1500",
          "blower-only": "Ignition system or gas supply issue — $400-2000",
        },
        difficulty: "Hard",
      },
      {
        name: "Uneven cooling",
        keywords: ["uneven", "hot", "cold", "zone", "room", "upstairs"],
        clarifyingQuestions: [
          "Which rooms are too hot and which are too cold?",
          "Are vents blocked or closed in any rooms?",
          "Is your home multi-story?",
        ],
        diagnostics: {
          blocked: "Ductwork design, damper issue, or furniture blocking — $0-500",
          zoning: "Need zone control system or ductwork repair — $1500-5000",
        },
        difficulty: "Medium",
      },
    ],
    systemPrompt: `You are a certified HVAC technician.
Diagnose heating/cooling issues systematically:
- Temperature differential (input vs output)
- Blower operation vs. heat/coolant generation
- Filter condition and airflow
- Thermostat calibration
- Safety shutoffs (limits, overflow)
- Distinguish between seasonal maintenance needs and emergency repairs
- Always verify filter age and capacitor health for AC units`,
  },

  Electrical: {
    commonIssues: [
      {
        name: "Outlets not working",
        keywords: ["outlet", "power", "outlet", "plug", "not working"],
        clarifyingQuestions: [
          "Did you check the circuit breaker?",
          "Is there a GFCI outlet nearby (bathroom/kitchen)?",
          "Are ALL outlets in that room dead or just one?",
          "When did this start?",
        ],
        diagnostics: {
          breaker: "Tripped breaker — reset it; if repeats = wiring fault — $0-500",
          gfci: "GFCI outlet tripped — press reset; if repeats = water intrusion — $0-300",
          single: "Outlet failed or loose connection — $15-100 DIY or $200-400 pro",
        },
        difficulty: "Easy",
      },
      {
        name: "Flickering lights",
        keywords: ["flicker", "dim", "light", "flash", "unstable"],
        clarifyingQuestions: [
          "Is it one bulb or multiple rooms?",
          "Does it flicker during high-power use (AC, microwave)?",
          "How old is the bulb?",
          "Is the fixture making any noise?",
        ],
        diagnostics: {
          bulb: "Bad bulb or incorrect type — $5-20",
          voltage: "Loose connection or oversized load — $100-400 DIY or $300-800 pro",
          fixture: "Internal ballast failure — $20-100 bulbs or $200-600 fixture",
        },
        difficulty: "Medium",
      },
    ],
    systemPrompt: `You are a licensed electrician.
Diagnose electrical issues with SAFETY as priority:
- Check breaker/GFCI status first
- Distinguish between circuit breaker vs. GFCI vs. outlet failure
- Load analysis (is something drawing too much power?)
- Voltage drop and grounding checks
- Never diagnose without confirming basic troubleshooting
- Recommend professional service for any uncertainty
- Include safety warnings for electrical work`,
  },

  Automotive: {
    commonIssues: [
      {
        name: "Engine knock",
        keywords: ["knock", "ping", "knocking", "tapping", "engine", "noise"],
        clarifyingQuestions: [
          "Is the knock worse under acceleration or load?",
          "When did it start? After new fuel, or gradually?",
          "What octane fuel do you normally use?",
          "Does the check engine light come on?",
          "Is it a sharp metallic ping or deep knock?",
        ],
        diagnostics: {
          detonation: "Low octane fuel or carbon buildup — use premium fuel or fuel system cleaner ($20-50)",
          bearing: "Engine bearing wear — requires engine work ($2000-8000)",
          valve: "Valve train issue — potential serious damage ($500-2000+)",
        },
        difficulty: "Hard",
      },
      {
        name: "Check engine light",
        keywords: ["check engine", "light", "code", "error"],
        clarifyingQuestions: [
          "Is the car running normally or are you noticing symptoms?",
          "Do you have the error code?",
          "When did the light come on?",
        ],
        diagnostics: {
          sensor: "O2 sensor or emissions issue — $200-500",
          catalytic: "Catalytic converter — $800-2000",
          severe: "Engine misfire or serious issue — $500-5000+",
        },
        difficulty: "Hard",
      },
    ],
    systemPrompt: `You are an ASE-certified mechanic.
Diagnose vehicle issues systematically:
- Sound characterization (knock frequency, timing relative to RPM/load)
- Conditions (cold start, acceleration, highway, idle)
- History (recent fuel change, maintenance, mileage)
- Error codes if present
- Distinguish between normal wear, tuning issues, and serious failures
- For unfamiliar sounds, recommend diagnostic scan
- Include safety warnings (do not drive if risky)`,
  },

  Carpentry: {
    commonIssues: [
      {
        name: "Squeaky floor",
        keywords: ["squeak", "floor", "noise", "creak"],
        clarifyingQuestions: [
          "Does the squeak happen in one spot or multiple places?",
          "Is the floor hardwood, laminate, or carpet?",
          "Is it over a basement or crawlspace?",
          "Does it get worse with humidity?",
        ],
        diagnostics: {
          loose: "Loose nails/screws — $0-50 DIY or $200-500 pro",
          subfloor: "Subfloor movement or moisture — $500-2000",
        },
        difficulty: "Easy",
      },
    ],
    systemPrompt: `You are a master carpenter.
Diagnose structural and finish issues:
- Distinguish cosmetic vs. structural problems
- Assess wood movement vs. actual damage
- Check for moisture, pest, or settlement issues
- Recommend appropriate materials and techniques
- Include timeline expectations (quick fix vs. major project)`,
  },
};

export function getTradeKnowledge(trade: string) {
  const key = Object.keys(DIAGNOSTIC_KNOWLEDGE).find(
    (k) => k.toLowerCase() === trade.toLowerCase()
  );
  return key ? DIAGNOSTIC_KNOWLEDGE[key as keyof typeof DIAGNOSTIC_KNOWLEDGE] : null;
}

export function findMatchingIssue(trade: string, description: string) {
  const knowledge = getTradeKnowledge(trade);
  if (!knowledge) return null;

  const descLower = description.toLowerCase();
  for (const issue of knowledge.commonIssues) {
    if (issue.keywords.some((kw) => descLower.includes(kw))) {
      return issue;
    }
  }
  return null;
}
