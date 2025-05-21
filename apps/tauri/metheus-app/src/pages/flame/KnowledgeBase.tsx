import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/components/ui/use-toast";

// Import knowledge base components
import KnowledgeBaseHeader from "@/components/knowledge-base/KnowledgeBaseHeader";
import FilesSection from "@/components/knowledge-base/FilesSection";
import DirectoriesSection from "@/components/knowledge-base/DirectoriesSection";
import UrlsSection from "@/components/knowledge-base/UrlsSection";
import WebsitesSection from "@/components/knowledge-base/WebsitesSection";
import NotesSection from "@/components/knowledge-base/NotesSection";

// Import dialog components
import FileSelector from "@/components/knowledge-base/dialogs/FileSelector";
import UrlDialog from "@/components/knowledge-base/dialogs/UrlDialog";
import NoteDialog from "@/components/knowledge-base/dialogs/NoteDialog";
import WebsiteMapDialog from "@/components/knowledge-base/dialogs/WebsiteMapDialog";

// Import store
import useKnowledgeBaseStore from "@/stores/useKnowledgeBaseStore";

/**
 * KnowledgeBase component
 * Provides interface for managing knowledge base resources
 */
const KnowledgeBase = () => {
  // Get state and actions from store
  const {
    files, setFiles, addFile,
    urls, addUrl,
    notes, addNote, updateNote,
    websiteMaps, addWebsiteMap,
    expandedSections, setExpandedSections
  } = useKnowledgeBaseStore();

  // Local state for UI
  const [isDragging, setIsDragging] = useState(false);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showWebsiteMapDialog, setShowWebsiteMapDialog] = useState(false);
  const [showEditNoteDialog, setShowEditNoteDialog] = useState(false);
  
  const [urlInput, setUrlInput] = useState("");
  const [websiteMapInput, setWebsiteMapInput] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);

  // Handlers
  const openSystemFileSelector = () => {
    setShowFileSelector(true);
  };

  const handleAddUrl = () => {
    setShowUrlDialog(true);
  };

  const handleAddNote = () => {
    setNoteTitle("");
    setNoteContent("");
    setShowNoteDialog(true);
  };

  const handleEditNote = (index: number) => {
    setEditingNoteIndex(index);
    setNoteTitle(notes[index].title);
    setNoteContent(notes[index].content);
    setShowEditNoteDialog(true);
  };

  const handleAddWebsiteMap = () => {
    setWebsiteMapInput("");
    setShowWebsiteMapDialog(true);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    // Process multiple URLs if separated by newlines
    const urlsToAdd = urlInput.split('\n').filter(url => url.trim());

    urlsToAdd.forEach(url => {
      addUrl({
        url: url.trim(),
        timestamp: new Date().toLocaleString('en-US', {
          hour12: false,
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '')
      });
    });

    setUrlInput("");
    setShowUrlDialog(false);
    
    toast({
      title: "URL added",
      description: `Added ${urlsToAdd.length} URL(s) to your knowledge base.`,
    });
  };

  const handleNoteSubmit = () => {
    if (!noteTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note title",
        variant: "destructive",
      });
      return;
    }

    const newNote = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      timestamp: new Date().toLocaleString('en-US', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '')
    };

    addNote(newNote);
    setNoteTitle("");
    setNoteContent("");
    setShowNoteDialog(false);
    
    toast({
      title: "Note added",
      description: "Added a new note to your knowledge base.",
    });
  };

  const handleEditNoteSubmit = () => {
    if (editingNoteIndex === null) return;

    if (!noteTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a note title",
        variant: "destructive",
      });
      return;
    }

    const updatedNote = {
      title: noteTitle.trim(),
      content: noteContent.trim(),
      timestamp: new Date().toLocaleString('en-US', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '')
    };

    updateNote(editingNoteIndex, updatedNote);
    setNoteTitle("");
    setNoteContent("");
    setShowEditNoteDialog(false);
    setEditingNoteIndex(null);

    toast({
      title: "Note updated",
      description: "Successfully updated note in your knowledge base.",
    });
  };

  const handleWebsiteMapSubmit = () => {
    if (!websiteMapInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL for the website map",
        variant: "destructive",
      });
      return;
    }

    const newWebsiteMap = {
      url: websiteMapInput.trim(),
      timestamp: new Date().toLocaleString('en-US', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '')
    };

    addWebsiteMap(newWebsiteMap);
    setWebsiteMapInput("");
    setShowWebsiteMapDialog(false);
    
    toast({
      title: "Website map added",
      description: "Added a new website map to your knowledge base.",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <KnowledgeBaseHeader />
      
      <div className="flex justify-center gap-4 mb-6">
        <button 
          onClick={openSystemFileSelector}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
        >
          Add File
        </button>
        <button 
          onClick={handleAddUrl}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
        >
          Add URL
        </button>
        <button 
          onClick={handleAddNote}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
        >
          Add Note
        </button>
        <button 
          onClick={handleAddWebsiteMap}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
        >
          Add Website Map
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          <Accordion 
            type="multiple" 
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="w-full space-y-6"
          >
            {/* Files Section */}
            <AccordionItem 
              value="files"
              className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <span>Files</span>
              </AccordionTrigger>
              <AccordionContent className="pt-0 pb-0">
                <FilesSection 
                  files={files}
                  setFiles={setFiles}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                  openSystemFileSelector={openSystemFileSelector}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Directories Section */}
            <AccordionItem 
              value="directories"
              className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <span>Directories</span>
              </AccordionTrigger>
              <AccordionContent>
                <DirectoriesSection />
              </AccordionContent>
            </AccordionItem>
            
            {/* URLs Section */}
            <AccordionItem 
              value="urls"
              className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <span>URLs</span>
              </AccordionTrigger>
              <AccordionContent>
                <UrlsSection 
                  urls={urls}
                  handleAddUrl={handleAddUrl}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Websites Section */}
            <AccordionItem 
              value="websites"
              className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <span>Websites</span>
              </AccordionTrigger>
              <AccordionContent>
                <WebsitesSection 
                  websiteMaps={websiteMaps}
                  handleAddWebsiteMap={handleAddWebsiteMap}
                />
              </AccordionContent>
            </AccordionItem>
            
            {/* Notes Section */}
            <AccordionItem 
              value="notes"
              className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <span>Notes</span>
              </AccordionTrigger>
              <AccordionContent>
                <NotesSection 
                  notes={notes}
                  handleAddNote={handleAddNote}
                  handleEditNote={handleEditNote}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Dialogs */}
        <FileSelector 
          open={showFileSelector} 
          onOpenChange={setShowFileSelector} 
          addFile={addFile} 
        />
        
        <UrlDialog 
          open={showUrlDialog}
          onOpenChange={setShowUrlDialog}
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          handleUrlSubmit={handleUrlSubmit}
        />
        
        <NoteDialog 
          open={showNoteDialog}
          onOpenChange={setShowNoteDialog}
          title={noteTitle}
          setTitle={setNoteTitle}
          content={noteContent}
          setContent={setNoteContent}
          onSubmit={handleNoteSubmit}
        />
        
        <NoteDialog 
          open={showEditNoteDialog}
          onOpenChange={setShowEditNoteDialog}
          title={noteTitle}
          setTitle={setNoteTitle}
          content={noteContent}
          setContent={setNoteContent}
          onSubmit={handleEditNoteSubmit}
          isEdit={true}
        />
        
        <WebsiteMapDialog 
          open={showWebsiteMapDialog}
          onOpenChange={setShowWebsiteMapDialog}
          websiteMapInput={websiteMapInput}
          setWebsiteMapInput={setWebsiteMapInput}
          handleWebsiteMapSubmit={handleWebsiteMapSubmit}
        />
      </div>
    </div>
  );
};

export default KnowledgeBase;