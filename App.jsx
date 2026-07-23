import React, { useState } from 'react';
import Header from './components/Header';
import TweetInput from './components/TweetInput';
import SummaryCards from './components/SummaryCards';
import SentimentMeter from './components/SentimentMeter';
import ResultsList from './components/ResultsList';
import { scoreTweet, classify } from './utils/sentiment';
import { analyzeWithOpenRouter } from './utils/openrouter';

const DEFAULT_TEXT = `just tried the new update and honestly it's a mess, so disappointed
crying at how good this album is, best thing i've heard all year
weather's fine i guess, nothing special either way`;

export default function App() {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'openrouter/free';

  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [results, setResults] = useState([]);
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState(apiKey ? 'ai' : 'lexicon');

  const toggleMode = () => {
    setMode(prev => (prev === 'ai' ? 'lexicon' : 'ai'));
    setErrorMsg('');
  };

  const handleRun = async () => {
    setErrorMsg('');
    const lines = inputText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setResults([]);
      setHasRun(false);
      return;
    }

    if (mode === 'ai') {
      if (!apiKey) {
        setErrorMsg('OpenRouter API key is missing. Please add VITE_OPENROUTER_API_KEY to your .env.local file or switch to Built-in Lexicon mode.');
        return;
      }

      setLoading(true);
      try {
        const scored = await analyzeWithOpenRouter(lines, apiKey, model);
        setResults(scored);
        setHasRun(true);
      } catch (err) {
        setErrorMsg(`OpenRouter AI Analysis Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Local Lexicon analysis
      const scored = lines.map(line => {
        const { score, hits } = scoreTweet(line);
        return { line, score, hits, cls: classify(score) };
      });
      setResults(scored);
      setHasRun(true);
    }
  };

  const posCount = results.filter(s => s.cls === 'pos').length;
  const neuCount = results.filter(s => s.cls === 'neu').length;
  const negCount = results.filter(s => s.cls === 'neg').length;
  const total = results.length;
  const avgScore = total > 0 ? results.reduce((a, s) => a + s.score, 0) / total : 0;

  return (
    <div className="wrap">
      <Header
        mode={mode}
        hasApiKey={Boolean(apiKey)}
        onToggleMode={toggleMode}
      />

      <TweetInput
        value={inputText}
        onChange={setInputText}
        onRun={handleRun}
        loading={loading}
        mode={mode}
      />

      {errorMsg && (
        <div className="error-box">
          {errorMsg}
        </div>
      )}

      <hr className="divider" />

      {hasRun && !errorMsg && (
        <div className="summary">
          <SummaryCards posCount={posCount} neuCount={neuCount} negCount={negCount} />
          <SentimentMeter
            posCount={posCount}
            neuCount={neuCount}
            negCount={negCount}
            total={total}
            avgScore={avgScore}
          />
        </div>
      )}

      <ResultsList items={hasRun && !errorMsg ? results : []} />

      <footer className="note">
        {mode === 'ai' ? (
          <>
            Powered by OpenRouter AI. Returns nuanced AI sentiment scores and highlights charged key phrases.
          </>
        ) : (
          <>
            Runs entirely in this page against a fixed lexicon, no live API connection required.
            It's a reasonable read on tone, not a substitute for careful judgement, especially with sarcasm or slang.
          </>
        )}
      </footer>
    </div>
  );
}
