import React, { useState } from 'react';
import { Campaign, PlatformOption } from '../../types/campaign';
import { StringListInput } from './StringListInput';
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  Layers, 
  AlertCircle,
  FileText,
  Share2,
  Tag,
  Users
} from 'lucide-react';

interface CampaignFormProps {
  initialData?: Campaign | null;
  onSave: (data: Omit<Campaign, 'id'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const AVAILABLE_PLATFORMS: PlatformOption[] = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'X / Twitter',
  'LinkedIn'
];

export const CampaignForm: React.FC<CampaignFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [productDescription, setProductDescription] = useState(initialData?.productDescription || '');
  const [productType, setProductType] = useState(initialData?.productType || '');
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || '');
  const [platforms, setPlatforms] = useState<string[]>(initialData?.platforms || ['Instagram', 'TikTok']);
  const [approvedClaims, setApprovedClaims] = useState<string[]>(initialData?.approvedClaims || []);
  const [prohibitedClaims, setProhibitedClaims] = useState<string[]>(initialData?.prohibitedClaims || []);
  const [requiredDisclosures, setRequiredDisclosures] = useState<string[]>(
    initialData?.requiredDisclosures || ['#ad', 'Sponsored by Brand']
  );
  const [instructions, setInstructions] = useState(initialData?.instructions || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Please specify a Campaign Name.');
      return;
    }
    if (!productDescription.trim()) {
      setValidationError('Please provide a Product/Service Description.');
      return;
    }
    if (!productType.trim()) {
      setValidationError('Please select or specify a Product Type.');
      return;
    }
    if (!targetAudience.trim()) {
      setValidationError('Please specify the Target Audience.');
      return;
    }
    if (platforms.length === 0) {
      setValidationError('Please select at least one target Platform.');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        productDescription: productDescription.trim(),
        productType: productType.trim(),
        targetAudience: targetAudience.trim(),
        platforms,
        approvedClaims,
        prohibitedClaims,
        requiredDisclosures,
        instructions: instructions.trim(),
        ownerId: initialData?.ownerId || '',
        ownerEmail: initialData?.ownerEmail || ''
      });
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  };

  return (
    <form id="campaign-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaigns</span>
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
            id="save-campaign-btn"
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : initialData ? 'Update Campaign' : 'Create Campaign'}</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Section 1: Core Details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-600" />
          Core Campaign Metadata
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Campaign Name *
            </label>
            <input
              id="campaign-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GlowSerum Summer 2026 UGC Launch"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                Product Type *
              </label>
              <input
                id="product-type-input"
                type="text"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="e.g. Skincare, Dietary Supplement, SaaS, FinTech"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-500" />
                Target Audience *
              </label>
              <input
                id="target-audience-input"
                type="text"
                required
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Gen Z skincare enthusiasts, remote professionals aged 25-40"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-slate-500" />
              Product / Service Description *
            </label>
            <textarea
              id="product-desc-input"
              rows={3}
              required
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Provide context on the product formulation, core benefits, usage routine, and unique selling proposition..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 bg-white"
            />
          </div>

          {/* Platforms selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 flex items-center gap-1">
              <Share2 className="w-3 h-3 text-slate-500" />
              Target Platforms *
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PLATFORMS.map((platform) => {
                const isSelected = platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Approved Claims, Prohibited Claims, & Disclosures */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Claims & Disclosures Specification
        </h3>

        {/* Approved Claims */}
        <StringListInput
          id="approved-claims-list"
          label="Approved Claims"
          description="Specific product claims creators are allowed and encouraged to make in their UGC."
          items={approvedClaims}
          onChange={setApprovedClaims}
          placeholder="e.g. Visibly hydrates skin in 48 hours"
          badgeColor="green"
        />

        <div className="border-t border-slate-100" />

        {/* Prohibited Claims */}
        <StringListInput
          id="prohibited-claims-list"
          label="Prohibited Claims"
          description="Claims strictly forbidden (e.g. medical cures, unsubstantiated statistics, permanent results)."
          items={prohibitedClaims}
          onChange={setProhibitedClaims}
          placeholder="e.g. Permanently eliminates eczema / cures acne"
          badgeColor="red"
        />

        <div className="border-t border-slate-100" />

        {/* Required Disclosures */}
        <StringListInput
          id="required-disclosures-list"
          label="Required Disclosures"
          description="Mandatory disclosure hashtags or spoken phrases required for regulatory compliance."
          items={requiredDisclosures}
          onChange={setRequiredDisclosures}
          placeholder="e.g. #ad, #paidpartner, Results may vary"
          badgeColor="blue"
        />
      </div>

      {/* Section 3: Campaign Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          Campaign Instructions & Creator Guidelines (Free text)
        </label>
        <p className="text-[11px] text-slate-600">
          Specific production instructions for creators: video hook ideas, visual staging, b-roll requirements, tone of voice, dos and don'ts.
        </p>
        <textarea
          id="campaign-instructions-input"
          rows={5}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Example: Hook viewers in the first 2 seconds showing the bottle texture. Mention the gentle morning application. Avoid showing competitors' packaging in the background..."
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 bg-white font-mono text-xs"
        />
      </div>

      {/* Bottom save bar */}
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
          id="bottom-save-campaign-btn"
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving to Firestore...' : initialData ? 'Save Changes' : 'Create Campaign'}</span>
        </button>
      </div>
    </form>
  );
};
