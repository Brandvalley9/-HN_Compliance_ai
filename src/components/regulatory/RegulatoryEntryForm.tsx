import React, { useState } from 'react';
import { RegulatoryEntry, COMMON_REGULATORY_SOURCES, POPULAR_TOPIC_TAGS } from '../../types/regulatory';
import { StringListInput } from '../campaigns/StringListInput';
import { 
  ArrowLeft, 
  Save, 
  BookOpen, 
  AlertCircle, 
  Link as LinkIcon, 
  Calendar, 
  FileText,
  Bookmark,
  ExternalLink
} from 'lucide-react';

interface RegulatoryEntryFormProps {
  onSave: (entry: Omit<RegulatoryEntry, 'id'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const RegulatoryEntryForm: React.FC<RegulatoryEntryFormProps> = ({
  onSave,
  onCancel,
  isSaving
}) => {
  const [source, setSource] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [sectionRef, setSectionRef] = useState('');
  const [summary, setSummary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [topicTags, setTopicTags] = useState<string[]>(['disclosure']);
  const [sourceUrl, setSourceUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const addQuickTag = (tag: string) => {
    if (!topicTags.includes(tag)) {
      setTopicTags([...topicTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!source.trim()) {
      setValidationError('Please select or specify a Regulatory Source (e.g. FCA, ASA, CAP).');
      return;
    }
    if (!documentName.trim()) {
      setValidationError('Please provide the Document or Rule Name.');
      return;
    }
    if (!sectionRef.trim()) {
      setValidationError('Please provide a Section or Reference (e.g. Rule 3.1).');
      return;
    }
    if (!summary.trim()) {
      setValidationError('Please enter a plain-text summary of the rule.');
      return;
    }
    if (!effectiveDate.trim()) {
      setValidationError('Please specify the effective date.');
      return;
    }
    if (topicTags.length === 0) {
      setValidationError('Please provide at least one topic tag (e.g. "disclosure", "misleading claims").');
      return;
    }
    if (!sourceUrl.trim()) {
      setValidationError('Please provide a Source URL to the official statute or guideline.');
      return;
    }

    try {
      await onSave({
        source: source.trim(),
        documentName: documentName.trim(),
        sectionRef: sectionRef.trim(),
        summary: summary.trim(),
        effectiveDate: effectiveDate.trim(),
        topicTags,
        sourceUrl: sourceUrl.trim()
      });
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save regulatory entry');
    }
  };

  return (
    <form id="regulatory-entry-form" onSubmit={handleSubmit} className="space-y-5">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Knowledge List</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-regulatory-entry-btn"
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Add Regulatory Entry'}</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Source input with quick suggestions */}
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              Regulatory Source *
            </label>
            <input
              id="reg-source-input"
              type="text"
              required
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. FCA, ASA, CAP, FTC, FDA"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
            {/* Quick source pills */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {['FCA', 'ASA', 'CAP', 'FTC', 'FDA'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 border border-slate-200"
                >
                  +{s}
                </button>
              ))}
            </div>
          </div>

          {/* Section / Reference */}
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Section or Reference *
            </label>
            <input
              id="reg-section-ref-input"
              type="text"
              required
              value={sectionRef}
              onChange={(e) => setSectionRef(e.target.value)}
              placeholder="e.g. Rule 2.4, Section 3.1, 16 CFR § 255"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          {/* Effective Date */}
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Effective Date *
            </label>
            <input
              id="reg-effective-date-input"
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {/* Document or Rule Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1">
            Document / Rule Name *
          </label>
          <input
            id="reg-doc-name-input"
            type="text"
            required
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="e.g. CAP Code (Non-broadcast Advertising) / Guides Concerning the Use of Endorsements"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
            Source URL *
          </label>
          <input
            id="reg-source-url-input"
            type="url"
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.asa.org.uk/codes-and-rulings/advertising-codes.html"
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
          />
        </div>

        {/* Plain-text Summary of the Rule */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            Plain-text Summary of the Rule *
          </label>
          <textarea
            id="reg-summary-input"
            rows={4}
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Provide a clear, objective summary of the compliance mandate, prohibited claims, required qualifications, and standards..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white leading-relaxed"
          />
        </div>

        {/* Topic Tags Input */}
        <div className="pt-2 border-t border-slate-100">
          <StringListInput
            id="topic-tags-input"
            label="Topic Tags *"
            description="Categorization tags for filtering and indexing (e.g. 'disclosure', 'misleading claims', 'guaranteed returns')."
            items={topicTags}
            onChange={setTopicTags}
            placeholder="Type topic tag and press Add..."
            badgeColor="slate"
          />

          {/* Quick tag suggestions */}
          <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              Suggested Topic Tags (Click to add):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TOPIC_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addQuickTag(tag)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                    topicTags.includes(tag)
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-medium'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom submit */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          id="bottom-submit-reg-btn"
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving to Firestore...' : 'Add Regulatory Entry'}</span>
        </button>
      </div>
    </form>
  );
};
