import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface SituationDetails {
  mode: 'collect' | 'negotiate';
  amount: string;
  overdue: string;
  relationship: string;
  channel: string;
  language: 'Hinglish' | 'English';
  customerName: string;
  yourName: string;
  otherInfo: string;
  delayReason: string;
  proposedSolution: string;
  customReason: string;
  customSolution: string;
}

interface GeneratedMessage {
  variant: string;
  title: string;
  content: string;
}

interface Result {
  summary: string;
  principles: string[];
  variants: GeneratedMessage[];
  voiceNote: string;
}

// --- Constants ---
const DELAY_REASONS = [
  'Cash flow issues',
  'Waiting for another payment',
  'Medical/Family emergency',
  'Technical error in banking',
  'Forgot in busy schedule',
  'Other (Custom)'
];

const PROPOSED_SOLUTIONS = [
  'Pay 50% now, rest in 1 week',
  'Clear full amount by next Friday',
  'Need a small discount/waiver',
  'Requesting extra 15 days',
  'Other (Custom)'
];

// --- Components ---

const Header: React.FC = () => (
  <header className="bg-white border-b sticky top-0 z-10 p-4 shadow-sm">
    <div className="max-w-4xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="bg-emerald-600 text-white p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">PaisaPrompt</h1>
      </div>
      <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wider">Tone Specialist</span>
    </div>
  </header>
);

const App: React.FC = () => {
  const [details, setDetails] = useState<SituationDetails>({
    mode: 'collect',
    amount: '',
    overdue: '',
    relationship: 'Client',
    channel: 'WhatsApp',
    language: 'Hinglish',
    customerName: '',
    yourName: '',
    otherInfo: '',
    delayReason: DELAY_REASONS[0],
    proposedSolution: PROPOSED_SOLUTIONS[0],
    customReason: '',
    customSolution: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const generateOutput = async () => {
    if (!details.amount) {
      setError("Please enter the amount.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const finalReason = details.delayReason === 'Other (Custom)' ? details.customReason : details.delayReason;
      const finalSolution = details.proposedSolution === 'Other (Custom)' ? details.customSolution : details.proposedSolution;

      const languageInstruction = details.language === 'Hinglish' 
        ? "Use natural Hinglish (mix of simple Hindi + English) in Roman script. Use words like 'bhai', 'sir', 'ma'am', 'yaar' appropriately. Never use Devanagari."
        : "Use professional, polite, and warm English. Maintain a helpful and respectful tone.";

      const systemInstruction = `You are an expert in creating polite, high-success-rate payment reminders for India. 
      Language Requirement: ${languageInstruction}
      Tone: Respectful, professional, friendly, never threatening. Use psychological levers like Reciprocity, Commitment, and Face-saving.
      
      STRUCTURE RULES:
      1. Situation summary: 1 short sentence in English.
      2. Key psychological principles: List 3-6 items.
      3. Message Variants:
         - Variant A: Sabse zyada warm (most empathetic)
         - Variant B: Reciprocity focus (remind of value/service provided)
         - Variant C: Soft time sensitivity + easy call-to-action
         - Variant D: Face-saving excuse (busy life/system error) + positive future.
      4. Voice Note script: Short spoken opener in the selected language.
      
      IMPORTANT: Ensure all messages end with a clear Call to Action. Length: 80-180 words each. Do not use placeholders like [Your Name] if names are provided.`;

      const userPrompt = `
        Mode: ${details.mode}
        Amount: ${details.amount}
        Relationship: ${details.relationship}
        Channel: ${details.channel}
        Target Language: ${details.language}
        Customer Name: ${details.customerName || 'Customer'}
        Sender Name: ${details.yourName || 'Sender'}
        How long overdue: ${details.overdue}
        ${details.mode === 'negotiate' ? `Reason for Delay: ${finalReason}\nProposed Solution: ${finalSolution}` : ''}
        Additional Context: ${details.otherInfo}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              principles: { type: Type.ARRAY, items: { type: Type.STRING } },
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    variant: { type: Type.STRING },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["variant", "title", "content"]
                }
              },
              voiceNote: { type: Type.STRING }
            },
            required: ["summary", "principles", "variants", "voiceNote"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text || '{}');
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <Header />
      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Mode Selector */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200">
          <button 
            onClick={() => { setDetails(d => ({ ...d, mode: 'collect' })); setResult(null); }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${details.mode === 'collect' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Collect Payment
          </button>
          <button 
            onClick={() => { setDetails(d => ({ ...d, mode: 'negotiate' })); setResult(null); }}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${details.mode === 'negotiate' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Negotiate Delay
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Amount</label>
                <input name="amount" value={details.amount} onChange={handleInputChange} placeholder="e.g. ₹4,500" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Relationship</label>
                <select name="relationship" value={details.relationship} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option>Client</option>
                  <option>Friend / Family</option>
                  <option>Tenant</option>
                  <option>Freelance Work</option>
                  <option>Business Partner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Language</label>
                <select name="language" value={details.language} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium">
                  <option value="Hinglish">Hinglish (Hindi + English)</option>
                  <option value="English">English (Professional)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Platform</label>
                  <select name="channel" value={details.channel} onChange={handleInputChange} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>WhatsApp</option>
                    <option>SMS</option>
                    <option>Email</option>
                    <option>LinkedIn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Overdue</label>
                  <input name="overdue" value={details.overdue} onChange={handleInputChange} placeholder="e.g. 5 days" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Their Name</label>
                <input name="customerName" value={details.customerName} onChange={handleInputChange} placeholder="Optional" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Your Name</label>
                <input name="yourName" value={details.yourName} onChange={handleInputChange} placeholder="Optional" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>
          </div>

          {details.mode === 'negotiate' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-emerald-800 mb-1.5 uppercase tracking-wide">Reason for Delay</label>
                  <select name="delayReason" value={details.delayReason} onChange={handleInputChange} className="w-full p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                    {DELAY_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                {details.delayReason === 'Other (Custom)' && (
                  <input name="customReason" value={details.customReason} onChange={handleInputChange} placeholder="Type custom reason..." className="w-full p-3 bg-white border border-emerald-200 rounded-xl outline-none" />
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-emerald-800 mb-1.5 uppercase tracking-wide">Proposed Solution</label>
                  <select name="proposedSolution" value={details.proposedSolution} onChange={handleInputChange} className="w-full p-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500">
                    {PROPOSED_SOLUTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {details.proposedSolution === 'Other (Custom)' && (
                  <input name="customSolution" value={details.customSolution} onChange={handleInputChange} placeholder="Type custom solution..." className="w-full p-3 bg-white border border-emerald-200 rounded-xl outline-none" />
                )}
              </div>
            </div>
          )}

          <button 
            onClick={generateOutput} 
            disabled={loading}
            className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-xl shadow-emerald-200 transition-all flex items-center justify-center space-x-2 ${loading ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Drafting Polite Messages...</span>
              </>
            ) : (
              <span>Generate Reminders</span>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="bg-emerald-100 text-emerald-600 p-1 rounded-md mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </span>
                Strategy Summary
              </h2>
              <p className="text-gray-600 mb-4 italic">"{result.summary}"</p>
              <div className="flex flex-wrap gap-2">
                {result.principles.map((p, i) => (
                  <span key={i} className="text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.variants.map((v, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col group hover:border-emerald-200 transition-all duration-300">
                  <div className="p-5 border-b border-gray-50 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">{v.variant}</span>
                      <h3 className="text-sm font-bold text-gray-800">{v.title}</h3>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(v.content, `${v.variant}-${i}`)}
                      className={`p-2.5 rounded-xl transition-all ${copiedId === `${v.variant}-${i}` ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}
                    >
                      {copiedId === `${v.variant}-${i}` ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                      )}
                    </button>
                  </div>
                  <div className="p-6 flex-grow">
                    <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{v.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-400 transform translate-x-4 -translate-y-4">
                <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.07A7 7 0 0 0 19 10z"/></svg>
              </div>
              <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Voice Note / Call Opener</h3>
              <p className="text-slate-100 text-lg font-medium leading-relaxed italic pr-12">
                "{result.voiceNote}"
              </p>
            </div>
          </div>
        )}
      </main>
      
      <footer className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-400 text-xs">PaisaPrompt helps you maintain trust while ensuring cash flow. Use these as a starting point.</p>
      </footer>
    </div>
  );
};

export default App;