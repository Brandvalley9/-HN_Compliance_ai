import React, { useState, useMemo } from 'react';
import { RegulatoryEntry } from '../../types/regulatory';
import { 
  Search, 
  Tag, 
  ExternalLink, 
  Calendar, 
  Filter, 
  Plus, 
  BookOpen, 
  Trash2,
  Bookmark,
  ChevronDown,
  X
} from 'lucide-react';

interface RegulatoryListProps {
  entries: RegulatoryEntry[];
  loading: boolean;
  onAddNew: () => void;
  onDeleteEntry?: (id: string) => void;
}

export const RegulatoryList: React.FC<RegulatoryListProps> = ({
  entries,
  loading,
  onAddNew,
  onDeleteEntry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  // Extract unique topic tags and sources
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach(e => {
      e.topicTags?.forEach(t => tagSet.add(t.trim().toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  const allSources = useMemo(() => {
    const sourceSet = new Set<string>();
    entries.forEach(e => {
      if (e.source) sourceSet.add(e.source.trim().toUpperCase());
    });
    return Array.from(sourceSet).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      // Source filter
      if (selectedSource && item.source.trim().toUpperCase() !== selectedSource) {
        return false;
      }

      // Tag filter
      if (selectedTag) {
        const itemTags = (item.topicTags || []).map(t => t.trim().toLowerCase());
        if (!itemTags.includes(selectedTag)) {
          return false;
        }
      }

      // Search query filter (matches summary, doc name, section, source, tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDoc = item.documentName?.toLowerCase().includes(q);
        const matchesSummary = item.summary?.toLowerCase().includes(q);
        const matchesSection = item.sectionRef?.toLowerCase().includes(q);
        const matchesSource = item.source?.toLowerCase().includes(q);
        const matchesTags = item.topicTags?.some(t => t.toLowerCase().includes(q));
        if (!matchesDoc && !matchesSummary && !matchesSection && !matchesSource && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [entries, selectedTag, selectedSource, searchQuery]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading Regulatory Knowledge from Firestore...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls & stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Regulatory Knowledge Entries</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
              {entries.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin/Reviewer reference repository of statutes, advertising rules, and compliance guidance.
          </p>
        </div>

        <button
          id="add-regulatory-entry-btn"
          type="button"
          onClick={onAddNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch gap-2.5">
          {/* Search field */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="regulatory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by rule name, summary, section, or keywords..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Source dropdown */}
          <div className="flex items-center gap-2">
            <select
              id="source-filter-select"
              value={selectedSource || ''}
              onChange={(e) => setSelectedSource(e.target.value || null)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white text-slate-700"
            >
              <option value="">All Sources</option>
              {allSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Topic Tag Filtering Bar */}
        {allTags.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Tag className="w-3 h-3" />
              Filter by Topic:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                selectedTag === null
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              All Topics
            </button>
            {allTags.map(tag => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry Results */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center shadow-2xs space-y-2">
          <BookOpen className="w-8 h-8 text-amber-600/60 mx-auto" />
          <h3 className="text-xs font-bold text-slate-800">No regulatory entries match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms or clearing selected topic tags to see more records.
          </p>
          {(selectedTag || selectedSource || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTag(null);
                setSelectedSource(null);
                setSearchQuery('');
              }}
              className="mt-2 px-3 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredEntries.map((entry) => {
            const formattedDate = entry.effectiveDate
              ? new Date(entry.effectiveDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'N/A';

            return (
              <div
                key={entry.id}
                id={`reg-entry-${entry.id}`}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs space-y-3 transition-all"
              >
                {/* Header row: Source badge, section ref, effective date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase tracking-wide">
                      <Bookmark className="w-3 h-3 text-amber-600" />
                      {entry.source}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {entry.sectionRef}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Effective: {formattedDate}
                    </span>

                    {onDeleteEntry && entry.id && (
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id!)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Document Name */}
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {entry.documentName}
                </h3>

                {/* Plain-text Summary */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  <p>{entry.summary}</p>
                </div>

                {/* Footer: Topic tags and Source URL */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {/* Topic tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.topicTags?.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag.trim().toLowerCase())}
                        className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 transition-colors"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  {/* External Source Link */}
                  {entry.sourceUrl && (
                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors shrink-0"
                    >
                      <span>Official Source Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
