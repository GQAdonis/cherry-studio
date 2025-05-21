import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UrlItem {
  url: string;
  timestamp: string;
}

export interface NoteItem {
  title: string;
  content: string;
  timestamp: string;
}

export interface WebsiteMapItem {
  url: string;
  timestamp: string;
}

interface KnowledgeBaseState {
  files: File[];
  urls: UrlItem[];
  notes: NoteItem[];
  websiteMaps: WebsiteMapItem[];
  expandedSections: string[];
  
  // Actions
  setFiles: (files: File[]) => void;
  addFile: (file: File) => void;
  removeFile: (index: number) => void;
  
  setUrls: (urls: UrlItem[]) => void;
  addUrl: (url: UrlItem) => void;
  removeUrl: (index: number) => void;
  
  setNotes: (notes: NoteItem[]) => void;
  addNote: (note: NoteItem) => void;
  updateNote: (index: number, note: NoteItem) => void;
  removeNote: (index: number) => void;
  
  setWebsiteMaps: (websiteMaps: WebsiteMapItem[]) => void;
  addWebsiteMap: (websiteMap: WebsiteMapItem) => void;
  removeWebsiteMap: (index: number) => void;
  
  setExpandedSections: (sections: string[]) => void;
  toggleSection: (section: string) => void;
}

const useKnowledgeBaseStore = create<KnowledgeBaseState>()(
  persist(
    (set) => ({
      files: [],
      urls: [],
      notes: [],
      websiteMaps: [],
      expandedSections: [],
      
      setFiles: (files) => set({ files }),
      addFile: (file) => set((state) => ({ 
        files: [...state.files, file],
        expandedSections: state.expandedSections.includes('files') 
          ? state.expandedSections 
          : [...state.expandedSections, 'files']
      })),
      removeFile: (index) => set((state) => ({
        files: state.files.filter((_, i) => i !== index)
      })),
      
      setUrls: (urls) => set({ urls }),
      addUrl: (url) => set((state) => ({ 
        urls: [...state.urls, url],
        expandedSections: state.expandedSections.includes('urls') 
          ? state.expandedSections 
          : [...state.expandedSections, 'urls']
      })),
      removeUrl: (index) => set((state) => ({
        urls: state.urls.filter((_, i) => i !== index)
      })),
      
      setNotes: (notes) => set({ notes }),
      addNote: (note) => set((state) => ({ 
        notes: [...state.notes, note],
        expandedSections: state.expandedSections.includes('notes') 
          ? state.expandedSections 
          : [...state.expandedSections, 'notes']
      })),
      updateNote: (index, note) => set((state) => {
        const updatedNotes = [...state.notes];
        updatedNotes[index] = note;
        return { notes: updatedNotes };
      }),
      removeNote: (index) => set((state) => ({
        notes: state.notes.filter((_, i) => i !== index)
      })),
      
      setWebsiteMaps: (websiteMaps) => set({ websiteMaps }),
      addWebsiteMap: (websiteMap) => set((state) => ({ 
        websiteMaps: [...state.websiteMaps, websiteMap],
        expandedSections: state.expandedSections.includes('websites') 
          ? state.expandedSections 
          : [...state.expandedSections, 'websites']
      })),
      removeWebsiteMap: (index) => set((state) => ({
        websiteMaps: state.websiteMaps.filter((_, i) => i !== index)
      })),
      
      setExpandedSections: (sections) => set({ expandedSections: sections }),
      toggleSection: (section) => set((state) => ({
        expandedSections: state.expandedSections.includes(section)
          ? state.expandedSections.filter(s => s !== section)
          : [...state.expandedSections, section]
      })),
    }),
    {
      name: 'knowledge-base-storage',
      partialize: (state) => ({
        urls: state.urls,
        notes: state.notes,
        websiteMaps: state.websiteMaps,
        expandedSections: state.expandedSections,
      }),
    }
  )
);

export default useKnowledgeBaseStore;