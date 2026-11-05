'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySaved?: (key: string) => void;
}

const DEFAULT_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Dernière génération, recommandé)' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Ultra rapide et gratuit)' },
  { id: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash Latest (Recommandé)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Haute créativité gastronomique)' },
];

export default function SettingsModal({
  isOpen,
  onClose,
  onApiKeySaved,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('cook_gemini_api_key') || '';
      const storedModel = localStorage.getItem('cook_gemini_model') || 'gemini-2.5-flash';
      setApiKey(storedKey);
      setModel(storedModel);

      try {
        const storedModels = localStorage.getItem('cook_gemini_available_models');
        if (storedModels) setAvailableModels(JSON.parse(storedModels));
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        valid: false,
        message: 'Veuillez saisir une clé API avant de tester.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        if (data.bestModel) {
          setModel(data.bestModel);
          localStorage.setItem('cook_gemini_model', data.bestModel);
        }
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          localStorage.setItem('cook_gemini_available_models', JSON.stringify(data.models));
        }

        setTestResult({
          valid: true,
          message: data.message || 'Clé API Gemini vérifiée avec succès !',
        });
      } else {
        setTestResult({
          valid: false,
          message: data.error || 'Clé API invalide ou refusée.',
        });
      }
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: err.message || 'Erreur lors du test de connexion.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cook_gemini_api_key', apiKey.trim());
      localStorage.setItem('cook_gemini_model', model);
    }
    setSaveSuccess(true);
    if (onApiKeySaved) onApiKeySaved(apiKey.trim());
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleRemoveKey = () => {
    if (confirm('Voulez-vous supprimer votre clé API enregistrée ?')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cook_gemini_api_key');
        localStorage.removeItem('cook_gemini_available_models');
      }
      setApiKey('');
      setAvailableModels([]);
      setTestResult(null);
      if (onApiKeySaved) onApiKeySaved('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Paramètres de l'IA</h2>
              <p className="text-xs text-stone-500">Configurez votre clé Google Gemini API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Guide banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Comment obtenir une clé Google Gemini gratuite ?</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Google offre l'accès gratuit à l'API Gemini. Il vous suffit de vous connecter avec
              votre compte Google sur Google AI Studio et de générer une clé en 30 secondes.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-orange-700 hover:text-orange-900 font-bold underline pt-1"
            >
              <span>Obtenir ma clé sur Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Key Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              Clé API Google Gemini
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
                title={showKey ? 'Masquer' : 'Afficher'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              Votre clé reste stockée localement dans votre navigateur en toute sécurité.
            </p>
          </div>

          {/* Model selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Modèle d'IA utilisé
              </label>
              {availableModels.length > 0 && (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                  {availableModels.length} modèles détectés ✓
                </span>
              )}
            </div>

            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white font-medium text-stone-700"
            >
              {availableModels.length > 0
                ? availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                : DEFAULT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
            </select>
            <p className="text-[10px] text-stone-400">
              Le bouton « Tester la clé » sélectionne automatiquement le modèle actif le plus récent pour votre compte.
            </p>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                testResult.valid
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Paramètres enregistrés avec succès !</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="text-xs text-stone-400 hover:text-rose-600 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer la clé</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 disabled:opacity-40 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Test...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Tester la clé</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs rounded-xl shadow transition-all active:scale-95"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
