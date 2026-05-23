import { StrictMode } from "react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { RotateCcw, Share2 } from "lucide-react";
import "./styles.css";

type FormState = {
  hours: number;
  minutes: number;
  filamentGrams: number;
  electricityCostPerKwh: number;
  filamentCostPerKg: number;
  averagePrinterKwhPerHour: number;
};

type Preset = {
  name: string;
  filamentCostPerKg: number;
  averagePrinterKwhPerHour: number;
};

const STORAGE_KEY = "bambu-print-cost-calculator";

const DEFAULTS: FormState = {
  hours: 4,
  minutes: 30,
  filamentGrams: 85,
  electricityCostPerKwh: 0.3457,
  filamentCostPerKg: 20,
  averagePrinterKwhPerHour: 0.07,
};

const PRESETS: Preset[] = [
  { name: "PLA", filamentCostPerKg: 20, averagePrinterKwhPerHour: 0.06 },
  { name: "PETG", filamentCostPerKg: 22, averagePrinterKwhPerHour: 0.075 },
  { name: "TPU", filamentCostPerKg: 25, averagePrinterKwhPerHour: 0.065 },
];

function readStoredState(): FormState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function numberValue(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function App() {
  const [form, setForm] = React.useState<FormState>(readStoredState);
  const [copyLabel, setCopyLabel] = React.useState("Copy summary");

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const totalPrintHours = form.hours + form.minutes / 60;
  const filamentCost = (form.filamentGrams / 1000) * form.filamentCostPerKg;
  const electricityUsedKwh =
    totalPrintHours * form.averagePrinterKwhPerHour;
  const electricityCost = electricityUsedKwh * form.electricityCostPerKwh;
  const totalCost = filamentCost + electricityCost;
  const costPerPrintHour = totalPrintHours > 0 ? totalCost / totalPrintHours : 0;

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: Math.max(0, numberValue(Number(value))),
    }));
  };

  const applyPreset = (preset: Preset) => {
    setForm((current) => ({ ...current, ...preset }));
  };

  const reset = () => {
    setForm(DEFAULTS);
    setCopyLabel("Copy summary");
  };

  const copySummary = async () => {
    const summary = `Print estimate: ${form.hours}h ${form.minutes}m, ${form.filamentGrams}g filament, total ${money(totalCost)} - filament ${money(filamentCost)}, electricity ${money(electricityCost)}.`;

    await navigator.clipboard.writeText(summary);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy summary"), 1600);
  };

  return (
    <main className="app-shell">
      <section className="intro">
        <div>
          <p className="eyebrow">Bambu Lab A1 mini</p>
          <h1>Bambu Print Cost Calculator</h1>
        </div>
        <button className="ghost-button" onClick={reset} type="button">
          <RotateCcw aria-hidden="true" size={18} />
          Reset
        </button>
      </section>

      <section className="workspace" aria-label="Print cost calculator">
        <form className="inputs">
          <fieldset>
            <legend>Print details</legend>
            <div className="time-grid">
              <NumberField
                label="Print hours"
                min={0}
                step={1}
                value={form.hours}
                onChange={(value) => update("hours", value)}
              />
              <NumberField
                label="Print minutes"
                min={0}
                max={59}
                step={1}
                value={form.minutes}
                onChange={(value) => update("minutes", value)}
              />
            </div>
            <NumberField
              label="Filament weight in grams"
              min={0}
              step={1}
              value={form.filamentGrams}
              onChange={(value) => update("filamentGrams", value)}
            />
          </fieldset>

          <fieldset>
            <legend>Rates</legend>
            <NumberField
              label="Electricity cost per kWh"
              min={0}
              step={0.0001}
              value={form.electricityCostPerKwh}
              onChange={(value) => update("electricityCostPerKwh", value)}
            />
            <NumberField
              label="Filament cost per kg"
              min={0}
              step={0.01}
              value={form.filamentCostPerKg}
              onChange={(value) => update("filamentCostPerKg", value)}
            />
            <NumberField
              helper="0.05-0.09 is a reasonable range depending on material and bed temperature."
              label="A1 mini average kWh/hour"
              min={0}
              step={0.001}
              value={form.averagePrinterKwhPerHour}
              onChange={(value) => update("averagePrinterKwhPerHour", value)}
            />
          </fieldset>

          <div className="presets" aria-label="Material presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                type="button"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </form>

        <aside className="results" aria-live="polite">
          <div className="total-card">
            <span>Estimated total cost</span>
            <strong>{money(totalCost)}</strong>
          </div>

          <dl className="breakdown">
            <ResultRow label="Filament cost" value={money(filamentCost)} />
            <ResultRow label="Electricity cost" value={money(electricityCost)} />
            <ResultRow
              label="Electricity used"
              value={`${electricityUsedKwh.toFixed(3)} kWh`}
            />
            <ResultRow
              label="Cost per print hour"
              value={money(costPerPrintHour)}
            />
          </dl>

          <button className="copy-button" onClick={copySummary} type="button">
            <Share2 aria-hidden="true" size={18} />
            {copyLabel}
          </button>

          <p className="note">
            This is an estimate. Actual usage varies by material, bed temp,
            warm-up time, and room temperature.
          </p>
        </aside>
      </section>
    </main>
  );
}

function NumberField({
  helper,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  helper?: string;
  label: string;
  max?: number;
  min: number;
  onChange: (value: string) => void;
  step: number;
  value: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        step={step}
        type="number"
        value={value}
      />
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
