'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Category, MenuItem, RestaurantInfo } from '@/types';
import { NamahaStore } from '@/lib/store';
import {
  Bot,
  Send,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  Edit3,
  DollarSign,
  Eye,
  EyeOff,
  FolderTree,
  Tag,
  Clock,
  Upload,
  ArrowRight,
  HelpCircle,
  Utensils,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';

interface MenuAssistantProps {
  items: MenuItem[];
  categories: Category[];
  info: RestaurantInfo;
  onRefreshData: () => Promise<void> | void;
  onSaveItem: (item: MenuItem | Omit<MenuItem, 'id'>) => Promise<void> | void;
  onDeleteItem: (id: string) => Promise<void> | void;
  onToggleStatus: (id: string, isAvailable: boolean) => Promise<void> | void;
  onSaveCategory: (category: Category | Omit<Category, 'id'>) => Promise<void> | void;
}

interface ActionProposal {
  type:
    | 'change_price'
    | 'change_image'
    | 'rename_item'
    | 'toggle_availability'
    | 'change_description'
    | 'change_category'
    | 'change_prep_time'
    | 'change_ingredients'
    | 'delete_item'
    | 'add_item'
    | 'bulk_price';
  itemId?: string;
  itemName?: string;
  item?: MenuItem;
  oldValue?: string | number | boolean;
  newValue?: string | number | boolean;
  newImageFile?: File;
  newImageUrl?: string;
  targetCategory?: Category;
  newItemData?: Partial<MenuItem>;
  bulkItems?: { item: MenuItem; oldPrice: number; newPrice: number }[];
  confirmed?: boolean;
  cancelled?: boolean;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  proposal?: ActionProposal;
  options?: { label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  itemList?: MenuItem[];
  imagePreview?: string;
}

export const MenuAssistant: React.FC<MenuAssistantProps> = ({
  items,
  categories,
  onRefreshData,
  onSaveItem,
  onDeleteItem,
  onToggleStatus,
  onSaveCategory,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Namaste Admin! I am your AI Menu Assistant. You can manage prices, food images, names, descriptions, categories, availability, and delete dishes simply by chatting with me.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Guided Add Item Wizard State
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [wizardData, setWizardData] = useState<Partial<MenuItem>>({});

  // Active Interactive Flow (Rename, Description, Price)
  const [activeFlow, setActiveFlow] = useState<{
    type: 'rename' | 'description' | 'price';
    item: MenuItem;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Clean up object URL previews
  useEffect(() => {
    return () => {
      if (selectedFilePreview) {
        URL.revokeObjectURL(selectedFilePreview);
      }
    };
  }, [selectedFilePreview]);

  const addMessage = (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  // Helper: Secure upload image through /api/admin/upload-image
  const uploadImageSecurely = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', `assistant-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Upload failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.publicUrl) {
      throw new Error(data.error || 'Failed to obtain public URL from Supabase Storage');
    }

    return data.publicUrl;
  };

  // --------------------------------------------------------------------------
  // NATURAL LANGUAGE PARSING ENGINE
  // --------------------------------------------------------------------------
  const findItemByName = (query: string): MenuItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Exact name match
    const exact = items.filter((i) => i.name.toLowerCase() === q);
    if (exact.length > 0) return exact;

    // Word boundary / substring matches
    const subMatches = items.filter((i) => {
      const name = i.name.toLowerCase();
      return name.includes(q) || q.includes(name);
    });
    if (subMatches.length > 0) return subMatches;

    // Token match
    const tokens = q.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0) {
      const tokenMatches = items.filter((i) => {
        const name = i.name.toLowerCase();
        return tokens.some((t) => name.includes(t));
      });
      if (tokenMatches.length > 0) return tokenMatches;
    }

    return [];
  };

  const findCategoryByName = (query: string): Category | null => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      categories.find(
        (c) => c.name.toLowerCase() === q || c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
      ) || null
    );
  };

  // Main chat processing logic
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text && !selectedFile) return;

    // 1. Post User Message
    addMessage({
      sender: 'user',
      text: text || (selectedFile ? `Uploaded image: ${selectedFile.name}` : ''),
      imagePreview: selectedFilePreview || undefined,
    });

    const currentFile = selectedFile;
    const currentFilePreview = selectedFilePreview;

    setInputText('');
    setSelectedFile(null);
    setSelectedFilePreview(null);
    setIsProcessing(true);

    try {
      // 1. Check if inside Active Interactive Flow (Rename, Description, Price)
      if (activeFlow) {
        if (activeFlow.type === 'rename') {
          const newName = text.trim();
          if (newName) {
            proposeRename(activeFlow.item, newName);
            setActiveFlow(null);
            setIsProcessing(false);
            return;
          }
        } else if (activeFlow.type === 'description') {
          const newDesc = text.trim();
          if (newDesc) {
            proposeDescription(activeFlow.item, newDesc);
            setActiveFlow(null);
            setIsProcessing(false);
            return;
          }
        } else if (activeFlow.type === 'price') {
          const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            proposePriceChange(activeFlow.item, num);
            setActiveFlow(null);
            setIsProcessing(false);
            return;
          } else {
            addMessage({
              sender: 'bot',
              text: '⚠️ Please enter a valid price number in Rupees (e.g. 50, 75):',
            });
            setIsProcessing(false);
            return;
          }
        }
      }

      // 2. Check if inside Guided Add Item Wizard
      if (wizardStep !== null) {
        handleWizardInput(text, currentFile);
        setIsProcessing(false);
        return;
      }

      await parseAndExecuteCommand(text, currentFile, currentFilePreview);
    } catch (err: any) {
      addMessage({
        sender: 'bot',
        text: `❌ Error processing your request: ${err.message || 'Something went wrong.'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // COMMAND PARSER
  // --------------------------------------------------------------------------
  const parseAndExecuteCommand = async (
    text: string,
    attachedFile: File | null,
    attachedPreview: string | null
  ) => {
    const lower = text.toLowerCase().trim();

    // 1. Quick Report / Query: Items without images
    if (
      lower.includes('without image') ||
      lower.includes('missing image') ||
      lower.includes('no image') ||
      lower.includes('without photo') ||
      lower.includes('no photo')
    ) {
      const noImageItems = items.filter((i) => !i.image || i.image.trim() === '');
      if (noImageItems.length === 0) {
        addMessage({
          sender: 'bot',
          text: '🎉 Great news! All dishes in your menu currently have photos attached.',
        });
      } else {
        addMessage({
          sender: 'bot',
          text: `Found ${noImageItems.length} dishes without images. Click "Upload Photo" below to attach an image to any item:`,
          itemList: noImageItems,
        });
      }
      return;
    }

    // 2. Quick Report: Unavailable / Out of stock items
    if (
      lower.includes('unavailable') ||
      lower.includes('out of stock') ||
      lower.includes('disabled items') ||
      lower.includes('sold out')
    ) {
      const disabledItems = items.filter((i) => !i.isAvailable);
      if (disabledItems.length === 0) {
        addMessage({
          sender: 'bot',
          text: '✨ All menu items are currently marked as available and active on the website.',
        });
      } else {
        addMessage({
          sender: 'bot',
          text: `Found ${disabledItems.length} dishes currently marked as unavailable:`,
          itemList: disabledItems,
        });
      }
      return;
    }

    // 3. Quick Report: Missing descriptions
    if (
      lower.includes('missing description') ||
      lower.includes('without description') ||
      lower.includes('no description')
    ) {
      const noDescItems = items.filter((i) => !i.description || i.description.trim() === '');
      if (noDescItems.length === 0) {
        addMessage({
          sender: 'bot',
          text: '🎉 All dishes currently have descriptions in Supabase.',
        });
      } else {
        addMessage({
          sender: 'bot',
          text: `Found ${noDescItems.length} dishes with missing descriptions:`,
          itemList: noDescItems,
        });
      }
      return;
    }

    // 4. View category items: "Show me all items in Dosa category"
    const catMatchQuery = lower.match(/(?:show|list|view|all items in)\s+(?:the\s+)?([a-z0-9\s]+?)(?:\s+category|\s+dishes|\s+items|$)/);
    if (catMatchQuery && !lower.includes('without') && !lower.includes('price')) {
      const catName = catMatchQuery[1].trim();
      const cat = findCategoryByName(catName);
      if (cat) {
        const catItems = items.filter(
          (i) => i.categoryId === cat.id || i.categoryName.toLowerCase() === cat.name.toLowerCase()
        );
        addMessage({
          sender: 'bot',
          text: `📋 Category "${cat.name}" has ${catItems.length} items:`,
          itemList: catItems,
        });
        return;
      }
    }

    // 5. General View Menu
    if (lower === 'view menu' || lower === 'show menu' || lower === 'list menu' || lower === 'all items' || lower === 'menu') {
      addMessage({
        sender: 'bot',
        text: `📋 Total Menu: ${items.length} items across ${categories.length} categories. Select any dish below to manage:`,
        itemList: items.slice(0, 15),
      });
      return;
    }

    // 6. General Add Item
    if (
      lower === 'add menu item' ||
      lower === 'add a menu item' ||
      lower === 'add new item' ||
      lower === 'create item' ||
      lower === 'new item' ||
      lower === 'add a new menu item' ||
      lower === 'add item'
    ) {
      startAddItemWizard();
      return;
    }

    // 7. General Delete Flow trigger
    if (
      lower === 'delete' ||
      lower === 'delete item' ||
      lower === 'delete a item' ||
      lower === 'delete an item' ||
      lower === 'delete menu item' ||
      lower === 'delete a menu item' ||
      lower === 'delete dish' ||
      lower === 'delete a dish' ||
      lower === 'delete dishes' ||
      lower === 'remove item' ||
      lower === 'remove an item' ||
      lower === 'remove menu item' ||
      lower === 'remove a menu item' ||
      lower === 'remove dish' ||
      lower === 'remove a dish'
    ) {
      startDeleteItemFlow();
      return;
    }

    // 8. General Rename Flow trigger
    if (
      lower === 'rename' ||
      lower === 'rename item' ||
      lower === 'rename a item' ||
      lower === 'rename an item' ||
      lower === 'rename dish' ||
      lower === 'rename a dish' ||
      lower === 'change name' ||
      lower === 'edit name'
    ) {
      startRenameFlow();
      return;
    }

    // 9. General Price Flow trigger
    if (
      lower === 'change price' ||
      lower === 'price' ||
      lower === 'update price' ||
      lower === 'edit price' ||
      lower === 'set price' ||
      lower === 'change prices'
    ) {
      startPriceFlow();
      return;
    }

    // 10. General Category Flow trigger
    if (
      lower === 'change category' ||
      lower === 'move' ||
      lower === 'move item' ||
      lower === 'move dish' ||
      lower === 'move category' ||
      lower === 'category' ||
      lower === 'switch category' ||
      lower === 'transfer dish' ||
      lower === 'transfer item'
    ) {
      startCategoryFlow();
      return;
    }

    // 11. General Description Flow trigger
    if (
      lower === 'change description' ||
      lower === 'edit description' ||
      lower === 'description' ||
      lower === 'update description' ||
      lower === 'set description' ||
      lower === 'dish description'
    ) {
      startDescriptionFlow();
      return;
    }

    // 12. General Availability Flow trigger
    if (
      lower === 'availability' ||
      lower === 'toggle availability' ||
      lower === 'stock' ||
      lower === 'manage availability' ||
      lower === 'in stock'
    ) {
      startAvailabilityFlow();
      return;
    }

    // 13. General Image Flow trigger
    if (
      lower === 'image' ||
      lower === 'photo' ||
      lower === 'change image' ||
      lower === 'add image' ||
      lower === 'upload image' ||
      lower === 'change photo' ||
      lower === 'food photos'
    ) {
      startImageFlow();
      return;
    }

    // 14. Bulk Price adjustment: "Change all prices of snacks by 5" or "Increase dosa prices by 10"
    const bulkMatch = lower.match(/(?:change|increase|decrease|update)\s+all\s+(?:prices\s+of\s+)?([a-z0-9\s]+?)\s+(?:by|to)\s+₹?([0-9]+)/);
    if (bulkMatch) {
      const catName = bulkMatch[1].trim();
      const amount = parseInt(bulkMatch[2], 10);
      const isIncrease = lower.includes('increase') || lower.includes('by');
      const cat = findCategoryByName(catName);
      if (cat) {
        const targetItems = items.filter(
          (i) => i.categoryId === cat.id || i.categoryName.toLowerCase() === cat.name.toLowerCase()
        );
        if (targetItems.length > 0) {
          const bulkItems = targetItems.map((item) => ({
            item,
            oldPrice: item.price,
            newPrice: isIncrease ? item.price + amount : amount,
          }));

          addMessage({
            sender: 'bot',
            text: `⚠️ Bulk Price Update: Adjust prices for ${bulkItems.length} items in category "${cat.name}" by +₹${amount}?`,
            proposal: {
              type: 'bulk_price',
              targetCategory: cat,
              bulkItems,
            },
          });
          return;
        }
      }
    }

    // 15. Specific Rename Item Command:
    // "Rename Pesarrattu to Special Pesarrattu", "Change name of Vada to Medu Vada", "Change Idly name to Rava Idly"
    const renameMatch =
      lower.match(/(?:rename|change\s+(?:the\s+)?name\s+of|set\s+(?:the\s+)?name\s+of)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(?:to|as)\s+(.+)/i) ||
      lower.match(/(?:change|set|update)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+name\s+(?:to|as)\s+(.+)/i);

    if (renameMatch) {
      const oldNameQuery = renameMatch[1].trim();
      const newName = text.substring(text.toLowerCase().indexOf(renameMatch[2].toLowerCase())).trim();

      if (oldNameQuery && newName) {
        const matched = findItemByName(oldNameQuery);
        if (matched.length === 1) {
          proposeRename(matched[0], newName);
          return;
        } else if (matched.length > 1) {
          askDisambiguation(`Which dish would you like to rename to "${newName}"?`, matched, (chosenItem) => {
            proposeRename(chosenItem, newName);
          });
          return;
        }
      }
    }

    // 16. Specific Category Change Command:
    // "Move Vada to Snacks", "Change category of Poori to Breakfast", "Put Idly in Snacks", "Change Idly category to Snacks"
    const moveCatMatch =
      lower.match(/(?:move|change\s+category\s+of|transfer|put|set\s+category\s+of)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(?:to|into|under|in)\s+(?:the\s+)?(?:category\s+)?(.+)/i) ||
      lower.match(/(?:change|set|update)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+category\s+(?:to|as|into)\s+(.+)/i);

    if (moveCatMatch) {
      const dishQuery = moveCatMatch[1].trim();
      const targetCatQuery = moveCatMatch[2].replace(/(?:category|dishes)$/i, '').trim();
      const targetCat = findCategoryByName(targetCatQuery);

      if (targetCat && dishQuery) {
        const matched = findItemByName(dishQuery);
        if (matched.length === 1) {
          proposeCategoryChange(matched[0], targetCat);
          return;
        } else if (matched.length > 1) {
          askDisambiguation(`Which dish would you like to move to "${targetCat.name}"?`, matched, (chosenItem) => {
            proposeCategoryChange(chosenItem, targetCat);
          });
          return;
        }
      }
    }

    // 17. Specific Description Edit Command:
    // "Change description of Vada to Crispy golden fried lentil fritters", "Set Idly description to Steamed cakes"
    const descMatch =
      lower.match(/(?:change|set|update|edit)\s+(?:the\s+)?description\s+of\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+to\s+(.+)/i) ||
      lower.match(/(?:change|set|update|edit)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+description\s+to\s+(.+)/i);

    if (descMatch) {
      const dishQuery = descMatch[1].trim();
      const newDesc = text.substring(text.toLowerCase().indexOf(descMatch[2].toLowerCase())).trim();
      const matched = findItemByName(dishQuery);
      if (matched.length === 1) {
        proposeDescription(matched[0], newDesc);
        return;
      } else if (matched.length > 1) {
        askDisambiguation(`Which dish's description would you like to update?`, matched, (chosenItem) => {
          proposeDescription(chosenItem, newDesc);
        });
        return;
      }
    }

    // 18. Specific Price change command:
    // "Change price of Idly to 50", "Make idly 50 rupees", "Idly price 50", "Set Idly to 60"
    const priceMatch =
      lower.match(/(?:change|set|update|make)\s+(?:the\s+)?price\s+of\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(?:to|is|as)?\s*₹?\s*([0-9]+)/i) ||
      lower.match(/(?:change|set|update|make)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(?:price\s+to|price\s+is|to|is|price)\s*₹?\s*([0-9]+)/i) ||
      lower.match(/^(?:the\s+)?(?:item\s+|dish\s+)?([a-z0-9\s]+?)\s+(?:price\s+to|price\s+is|price\s+is\s+now|price)\s*₹?\s*([0-9]+)/i);

    if (priceMatch && !lower.includes('time') && !lower.includes('prep')) {
      const dishName = priceMatch[1]
        .replace(/^(?:make|set|change|update|the|price\s+of)/g, '')
        .trim();
      const newPrice = parseInt(priceMatch[2], 10);

      if (dishName && !isNaN(newPrice) && newPrice > 0) {
        const matched = findItemByName(dishName);
        if (matched.length === 1) {
          proposePriceChange(matched[0], newPrice);
          return;
        } else if (matched.length > 1) {
          askDisambiguation(`Which item should be updated to ₹${newPrice}?`, matched, (chosenItem) => {
            proposePriceChange(chosenItem, newPrice);
          });
          return;
        }
      }
    }

    // 19. Specific Availability Toggle:
    // "Make Pongal unavailable", "Make Dosa available", "Vada is out of stock", "Mark Idly as in stock"
    const availMatch =
      lower.match(/(?:make|mark|set)\s+(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(?:as\s+)?(available|unavailable|out\s+of\s+stock|in\s+stock|active|inactive)/i) ||
      lower.match(/(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+is\s+(available|unavailable|out\s+of\s+stock|in\s+stock|active|inactive)/i) ||
      lower.match(/^(?:the\s+)?(?:item\s+|dish\s+)?(.+?)\s+(out\s+of\s+stock|in\s+stock)$/i);

    if (availMatch) {
      const dishQuery = availMatch[1].trim();
      const statusWord = availMatch[2].toLowerCase();
      const isMakingAvailable = statusWord === 'available' || statusWord === 'in stock' || statusWord === 'active';

      if (dishQuery) {
        const matched = findItemByName(dishQuery);
        if (matched.length === 1) {
          proposeAvailabilityChange(matched[0], isMakingAvailable);
          return;
        } else if (matched.length > 1) {
          askDisambiguation(`Which item should be marked ${isMakingAvailable ? 'Available' : 'Unavailable'}?`, matched, (chosenItem) => {
            proposeAvailabilityChange(chosenItem, isMakingAvailable);
          });
          return;
        }
      }
    }

    // 20. Specific Delete Item Command: "Delete Vada", "Remove item Pongal from menu"
    const deleteMatch = lower.match(
      /(?:delete|remove|erase|drop)\s+(?:the\s+)?(?:item\s+|dish\s+|food\s+|menu\s+item\s+)?(.+?)(?:\s+from\s+(?:the\s+)?menu|\s+from\s+supabase|$)/i
    );
    if (
      deleteMatch &&
      !lower.includes('image') &&
      !lower.includes('photo') &&
      !lower.includes('picture') &&
      !lower.includes('description') &&
      !lower.includes('category')
    ) {
      const queryName = deleteMatch[1]
        .replace(/^(?:item|dish|food|menu\s+item|the)\s+/i, '')
        .replace(/\s+(?:from\s+(?:the\s+)?menu|\s+from\s+supabase)$/i, '')
        .trim();

      if (queryName && queryName !== 'item' && queryName !== 'dish' && queryName !== 'menu' && queryName !== 'items') {
        const matched = findItemByName(queryName);
        if (matched.length === 1) {
          proposeItemDeletion(matched[0]);
          return;
        } else if (matched.length > 1) {
          askDisambiguation('Which item would you like to delete?', matched, (selectedItem) => {
            proposeItemDeletion(selectedItem);
          });
          return;
        } else {
          addMessage({
            sender: 'bot',
            text: `🔍 I couldn't find any dish named "${queryName}". Select a dish below to delete or choose a category:`,
            itemList: items.slice(0, 10),
            options: categories.map((cat) => ({
              label: `📂 ${cat.name}`,
              action: () => startDeleteItemFlow(cat),
            })),
          });
          return;
        }
      }
    }

    // 21. Specific Image Upload / Change: "Add an image to Pesarrattu", "Change image of Masala Dosa"
    const isImageCommand =
      lower.includes('image') ||
      lower.includes('photo') ||
      lower.includes('picture') ||
      attachedFile !== null;

    if (isImageCommand) {
      // Case A: Image file is attached in this message
      if (attachedFile) {
        const potentialName = lower
          .replace(/(?:add|change|upload|put|attach|set)\s+(?:this\s+)?(?:image|photo|picture)\s+(?:to|for|of|on)?/g, '')
          .trim();

        if (potentialName) {
          const matched = findItemByName(potentialName);
          if (matched.length === 1) {
            proposeImageChange(matched[0], attachedFile);
            return;
          } else if (matched.length > 1) {
            askDisambiguation('Which dish should receive this image?', matched, (chosenItem) => {
              proposeImageChange(chosenItem, attachedFile);
            });
            return;
          }
        }

        // If no dish name specified in message, ask which item
        addMessage({
          sender: 'bot',
          text: '📸 Image received! Which menu item should I attach this image to?',
          options: items.slice(0, 8).map((item) => ({
            label: item.name,
            action: () => proposeImageChange(item, attachedFile),
          })),
        });
        return;
      }

      // Case B: Admin typed "Change image of X" without attaching file yet
      const dishQuery = lower
        .replace(/(?:add|change|upload|put|attach|replace)\s+(?:an?\s+)?(?:image|photo|picture)\s+(?:to|for|of|on)\s+/g, '')
        .trim();

      if (dishQuery) {
        const matched = findItemByName(dishQuery);
        if (matched.length === 1) {
          const item = matched[0];
          addMessage({
            sender: 'bot',
            text: `Please select or upload the new image for "${item.name}":`,
            options: [
              {
                label: `📁 Select Image for ${item.name}`,
                action: () => {
                  if (fileInputRef.current) {
                    fileInputRef.current.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) proposeImageChange(item, file);
                    };
                    fileInputRef.current.click();
                  }
                },
                variant: 'primary',
              },
            ],
          });
          return;
        } else if (matched.length > 1) {
          askDisambiguation('Which dish would you like to update the image for?', matched, (chosenItem) => {
            addMessage({
              sender: 'bot',
              text: `Please select or upload the image for "${chosenItem.name}":`,
              options: [
                {
                  label: `📁 Upload Image for ${chosenItem.name}`,
                  action: () => {
                    if (fileInputRef.current) {
                      fileInputRef.current.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) proposeImageChange(chosenItem, file);
                      };
                      fileInputRef.current.click();
                    }
                  },
                  variant: 'primary',
                },
              ],
            });
          });
          return;
        }
      }
    }

    // 22. Preparation time: "Change preparation time of Poori to 15 minutes"
    const prepMatch = lower.match(/(?:change|set|update)\s+(?:prep(?:aration)?\s+time\s+of|prep\s+time\s+for)\s+([a-z0-9\s]+?)\s+to\s+(.+)/i);
    if (prepMatch) {
      const dishQuery = prepMatch[1].trim();
      const newTime = prepMatch[2].trim();
      const matched = findItemByName(dishQuery);
      if (matched.length === 1) {
        const item = matched[0];
        addMessage({
          sender: 'bot',
          text: `Please confirm updated preparation time for "${item.name}":`,
          proposal: {
            type: 'change_prep_time',
            itemId: item.id,
            itemName: item.name,
            item,
            oldValue: item.preparationTime,
            newValue: newTime,
          },
        });
        return;
      }
    }

    // Fallback: If no intent was recognized
    addMessage({
      sender: 'bot',
      text: `I couldn't quite understand that command. Here are quick actions you can try:`,
      options: [
        { label: '✏️ Rename an Item', action: () => startRenameFlow() },
        { label: '💰 Change a Price', action: () => startPriceFlow() },
        { label: '📂 Change Category', action: () => startCategoryFlow() },
        { label: '📝 Edit Description', action: () => startDescriptionFlow() },
        { label: '👁 Manage Availability', action: () => startAvailabilityFlow() },
        { label: '🖼 Change Dish Image', action: () => startImageFlow() },
        { label: '🗑️ Delete a Menu Item', action: () => startDeleteItemFlow(), variant: 'danger' },
        { label: '➕ Add New Menu Item', action: () => startAddItemWizard() },
      ],
    });
  };

  // --------------------------------------------------------------------------
  // INTERACTIVE FLOW HELPERS
  // --------------------------------------------------------------------------

  // 1. Rename Flow
  const startRenameFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startRenameFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startRenameFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `✏️ **Rename Item in ${catFilter.name}:**\nClick "Rename" on any dish below, or type *"Rename <dish> to <new name>"*:`
        : `✏️ **Rename Menu Item:**\nSelect a dish below or choose a category to rename:`,
      options: catOptions,
      itemList: targetItems.slice(0, 12),
    });
  };

  const selectItemToRename = (item: MenuItem) => {
    setActiveFlow({ type: 'rename', item });
    addMessage({
      sender: 'bot',
      text: `✏️ Renaming **"${item.name}"** (Category: ${item.categoryName}, Price: ₹${item.price}).\n\n👉 **Type the new name for this dish in the chat below and press Send:**`,
    });
  };

  const proposeRename = (item: MenuItem, newName: string) => {
    addMessage({
      sender: 'bot',
      text: `Please confirm renaming **"${item.name}"** to **"${newName}"**:`,
      proposal: {
        type: 'rename_item',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: item.name,
        newValue: newName,
      },
    });
  };

  // 2. Description Flow
  const startDescriptionFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startDescriptionFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startDescriptionFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `📝 **Edit Description in ${catFilter.name}:**\nSelect a dish below to update its description:`
        : `📝 **Edit Dish Description:**\nSelect which dish you want to update description for:`,
      options: catOptions,
      itemList: targetItems.slice(0, 12),
    });
  };

  const selectItemToEditDescription = (item: MenuItem) => {
    setActiveFlow({ type: 'description', item });
    addMessage({
      sender: 'bot',
      text: `📝 Current description for **"${item.name}"**:\n*\"${item.description || 'No description yet'}\"*\n\n👉 **Type the new description in the chat below and press Send:**`,
    });
  };

  const proposeDescription = (item: MenuItem, newDesc: string) => {
    addMessage({
      sender: 'bot',
      text: `Please confirm the updated description for **"${item.name}"**:`,
      proposal: {
        type: 'change_description',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: item.description,
        newValue: newDesc,
      },
    });
  };

  // 3. Category Change Flow
  const startCategoryFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startCategoryFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startCategoryFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `📂 **Move Dishes in ${catFilter.name}:**\nClick "Move" on any dish below to switch its category:`
        : `📂 **Change Dish Category:**\nSelect which dish you want to move to another category:`,
      options: catOptions,
      itemList: targetItems.slice(0, 12),
    });
  };

  const selectItemToChangeCategory = (item: MenuItem) => {
    const otherCats = categories.filter((c) => c.id !== item.categoryId && c.name.toLowerCase() !== item.categoryName.toLowerCase());
    addMessage({
      sender: 'bot',
      text: `📂 Move **"${item.name}"** (Currently in *${item.categoryName}*) to which category?`,
      options: otherCats.map((cat) => ({
        label: `➡️ ${cat.name}`,
        action: () => proposeCategoryChange(item, cat),
      })),
    });
  };

  const proposeCategoryChange = (item: MenuItem, targetCategory: Category) => {
    addMessage({
      sender: 'bot',
      text: `Please confirm moving **"${item.name}"** from *"${item.categoryName}"* to *"${targetCategory.name}"*:`,
      proposal: {
        type: 'change_category',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: item.categoryName,
        newValue: targetCategory.name,
        targetCategory,
      },
    });
  };

  // 4. Price Flow
  const startPriceFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startPriceFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startPriceFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `💰 **Change Price in ${catFilter.name}:**\nSelect a dish below to update its price:`
        : `💰 **Update Dish Price:**\nSelect which dish you want to update price for:`,
      options: catOptions,
      itemList: targetItems.slice(0, 12),
    });
  };

  const selectItemToChangePrice = (item: MenuItem) => {
    setActiveFlow({ type: 'price', item });
    addMessage({
      sender: 'bot',
      text: `💰 Current price of **"${item.name}"** is **₹${item.price}**.\n\n👉 **Type the new price in the chat below** (or click a quick adjustment):`,
      options: [
        { label: `+₹5 (₹${item.price + 5})`, action: () => proposePriceChange(item, item.price + 5) },
        { label: `+₹10 (₹${item.price + 10})`, action: () => proposePriceChange(item, item.price + 10) },
        { label: `-₹5 (₹${Math.max(1, item.price - 5)})`, action: () => proposePriceChange(item, Math.max(1, item.price - 5)) },
      ],
    });
  };

  const proposePriceChange = (item: MenuItem, newPrice: number) => {
    addMessage({
      sender: 'bot',
      text: `Please confirm updating price for **"${item.name}"**:`,
      proposal: {
        type: 'change_price',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: item.price,
        newValue: newPrice,
      },
    });
  };

  // 5. Availability Flow
  const startAvailabilityFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startAvailabilityFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startAvailabilityFlow(),
      });
    }

    const disabledCount = items.filter((i) => !i.isAvailable).length;

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `👁 **Item Availability in ${catFilter.name}:**\nClick the toggle status button on any dish below:`
        : `👁 **Menu Availability Manager:**\nCurrently **${disabledCount} dishes** are marked as Out of Stock.\nClick to toggle availability on any dish:`,
      options: catOptions,
      itemList: targetItems.slice(0, 15),
    });
  };

  const proposeAvailabilityChange = (item: MenuItem, isAvailable: boolean) => {
    addMessage({
      sender: 'bot',
      text: `Please confirm setting **"${item.name}"** availability:`,
      proposal: {
        type: 'toggle_availability',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: item.isAvailable,
        newValue: isAvailable,
      },
    });
  };

  // 6. Image Flow
  const startImageFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions = categories.map((cat) => ({
      label: `📂 ${cat.name}`,
      action: () => startImageFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Dishes`,
        action: () => startImageFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: `🖼️ **Food Photo Manager:**\nClick "Upload Photo" or "Change Photo" on any dish below, or attach an image file directly in the chat:`,
      options: [
        {
          label: `📁 Select Image from Device`,
          action: () => {
            if (fileInputRef.current) fileInputRef.current.click();
          },
          variant: 'primary',
        },
        ...catOptions,
      ],
      itemList: targetItems.slice(0, 12),
    });
  };

  // 7. Delete Flow
  const startDeleteItemFlow = (catFilter?: Category) => {
    setActiveFlow(null);
    const targetItems = catFilter
      ? items.filter(
          (i) => i.categoryId === catFilter.id || i.categoryName.toLowerCase() === catFilter.name.toLowerCase()
        )
      : items;

    const catOptions: { label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger' }[] = categories.map((cat) => ({
      label: `📂 ${cat.name} (${items.filter((i) => i.categoryId === cat.id || i.categoryName.toLowerCase() === cat.name.toLowerCase()).length})`,
      action: () => startDeleteItemFlow(cat),
    }));

    if (catFilter) {
      catOptions.unshift({
        label: `🌐 Show All Categories`,
        action: () => startDeleteItemFlow(),
      });
    }

    addMessage({
      sender: 'bot',
      text: catFilter
        ? `🗑️ **Delete Item from ${catFilter.name}:**\nClick "Delete" on any dish below to remove it, or choose another category:`
        : `🗑️ **Delete Menu Item:**\nSelect a category or click "Delete" on any dish below to permanently remove it from Supabase:`,
      options: catOptions,
      itemList: targetItems.slice(0, 12),
    });
  };

  const proposeItemDeletion = (item: MenuItem) => {
    addMessage({
      sender: 'bot',
      text: `⚠️ Are you sure you want to permanently delete **"${item.name}"** (₹${item.price}) from the menu in Supabase?`,
      proposal: {
        type: 'delete_item',
        itemId: item.id,
        itemName: item.name,
        item,
        oldValue: `₹${item.price} • ${item.categoryName}`,
      },
    });
  };

  // Helper: propose image replacement
  const proposeImageChange = (item: MenuItem, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    addMessage({
      sender: 'bot',
      text: `Replace the current image of "${item.name}" with this uploaded photo?`,
      imagePreview: previewUrl,
      proposal: {
        type: 'change_image',
        itemId: item.id,
        itemName: item.name,
        item,
        newImageFile: file,
        oldValue: item.image,
      },
    });
  };

  // Helper: Disambiguation selection prompt
  const askDisambiguation = (promptText: string, matches: MenuItem[], onSelect: (item: MenuItem) => void) => {
    addMessage({
      sender: 'bot',
      text: `${promptText}`,
      options: matches.map((m) => ({
        label: `${m.name} (₹${m.price})`,
        action: () => onSelect(m),
      })),
    });
  };

  // --------------------------------------------------------------------------
  // ACTION EXECUTION (SUPABASE PERSISTENCE)
  // --------------------------------------------------------------------------
  const handleConfirmAction = async (msgId: string, proposal: ActionProposal) => {
    setIsProcessing(true);
    try {
      if (proposal.type === 'change_price' && proposal.itemId) {
        await NamahaStore.updateMenuItem(proposal.itemId, { price: Number(proposal.newValue) });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Price updated successfully! "${proposal.itemName}" is now ₹${proposal.newValue} in Supabase and live on customer phones.`,
        });
      } else if (proposal.type === 'rename_item' && proposal.itemId) {
        await NamahaStore.updateMenuItem(proposal.itemId, { name: String(proposal.newValue) });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Dish renamed successfully to "${proposal.newValue}" in Supabase.`,
        });
      } else if (proposal.type === 'toggle_availability' && proposal.itemId) {
        const isAvail = Boolean(proposal.newValue);
        await NamahaStore.updateMenuItem(proposal.itemId, { isAvailable: isAvail });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ "${proposal.itemName}" marked as ${isAvail ? '🟢 Available' : '🔴 Unavailable'} in Supabase.`,
        });
      } else if (proposal.type === 'change_image' && proposal.itemId && proposal.newImageFile) {
        // Upload to food-images bucket
        const publicUrl = await uploadImageSecurely(proposal.newImageFile);
        await NamahaStore.updateMenuItem(proposal.itemId, { image: publicUrl });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Food image updated successfully for "${proposal.itemName}" in Supabase Storage ("food-images") and synced live.`,
          imagePreview: publicUrl,
        });
      } else if (proposal.type === 'change_category' && proposal.itemId && proposal.targetCategory) {
        await NamahaStore.updateMenuItem(proposal.itemId, {
          categoryId: proposal.targetCategory.id,
          categoryName: proposal.targetCategory.name,
        });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ "${proposal.itemName}" moved to category "${proposal.targetCategory.name}" in Supabase.`,
        });
      } else if (proposal.type === 'change_description' && proposal.itemId) {
        await NamahaStore.updateMenuItem(proposal.itemId, { description: String(proposal.newValue) });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Description updated for "${proposal.itemName}" in Supabase.`,
        });
      } else if (proposal.type === 'change_prep_time' && proposal.itemId) {
        await NamahaStore.updateMenuItem(proposal.itemId, { preparationTime: String(proposal.newValue) });
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Preparation time for "${proposal.itemName}" updated to "${proposal.newValue}".`,
        });
      } else if (proposal.type === 'delete_item' && proposal.itemId) {
        await NamahaStore.deleteMenuItem(proposal.itemId);
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `🗑️ "${proposal.itemName}" has been permanently deleted from Supabase.`,
        });
      } else if (proposal.type === 'bulk_price' && proposal.bulkItems) {
        for (const itemObj of proposal.bulkItems) {
          await NamahaStore.updateMenuItem(itemObj.item.id, { price: itemObj.newPrice });
        }
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `✅ Successfully updated prices for all ${proposal.bulkItems.length} items in Supabase!`,
        });
      } else if (proposal.type === 'add_item' && proposal.newItemData) {
        const added = await NamahaStore.addMenuItem(proposal.newItemData as any);
        await onRefreshData();
        updateProposalStatus(msgId, true);
        addMessage({
          sender: 'bot',
          text: `🎉 New dish "${added.name}" added to Supabase and live on customer QR menus!`,
        });
      }
    } catch (err: any) {
      addMessage({
        sender: 'bot',
        text: `❌ Action failed: ${err.message || 'Could not update Supabase.'} Your existing menu data remains unchanged.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAction = (msgId: string) => {
    updateProposalStatus(msgId, false);
    addMessage({
      sender: 'bot',
      text: 'Action cancelled. No changes were made to Supabase.',
    });
  };

  const updateProposalStatus = (msgId: string, confirmed: boolean) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.proposal) {
          return {
            ...m,
            proposal: {
              ...m.proposal,
              confirmed,
              cancelled: !confirmed,
            },
          };
        }
        return m;
      })
    );
  };

  // --------------------------------------------------------------------------
  // GUIDED ADD NEW MENU ITEM WIZARD
  // --------------------------------------------------------------------------
  const startAddItemWizard = () => {
    setWizardStep(1);
    setWizardData({});
    addMessage({
      sender: 'bot',
      text: '✨ Let\'s add a new menu item step-by-step.\n\n**Step 1:** What is the **Name** of the new dish? (e.g. "Ghee Roast Masala Dosa")',
    });
  };

  const handleWizardInput = async (text: string, file: File | null) => {
    if (wizardStep === 1) {
      // Name received
      setWizardData((prev) => ({ ...prev, name: text }));
      setWizardStep(2);
      addMessage({
        sender: 'bot',
        text: `Great! "${text}".\n\n**Step 2:** Select the **Category** for this dish:`,
        options: categories.map((cat) => ({
          label: cat.name,
          action: () => {
            setWizardData((prev) => ({
              ...prev,
              categoryId: cat.id,
              categoryName: cat.name,
            }));
            setWizardStep(3);
            addMessage({
              sender: 'bot',
              text: `Category set to "${cat.name}".\n\n**Step 3:** What is the **Price in Rupees**? (e.g. "60")`,
            });
          },
        })),
      });
      return;
    }

    if (wizardStep === 3) {
      // Price received
      const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (isNaN(num) || num <= 0) {
        addMessage({
          sender: 'bot',
          text: 'Please enter a valid price number (e.g. 50 or 75):',
        });
        return;
      }
      setWizardData((prev) => ({ ...prev, price: num }));
      setWizardStep(4);
      addMessage({
        sender: 'bot',
        text: `Price set to ₹${num}.\n\n**Step 4:** Provide a short **Description** for the dish (or type "skip"):`,
      });
      return;
    }

    if (wizardStep === 4) {
      // Description received
      const desc = text.toLowerCase() === 'skip' ? `Authentic South Indian ${wizardData.name}` : text;
      setWizardData((prev) => ({ ...prev, description: desc }));
      setWizardStep(5);

      addMessage({
        sender: 'bot',
        text: `Description saved.\n\n**Step 5:** Would you like to attach an **Image**? (Upload an image now, or type "skip"):`,
        options: [
          {
            label: '📁 Select Image File',
            action: () => {
              if (fileInputRef.current) {
                fileInputRef.current.onchange = async (e: any) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    try {
                      setIsProcessing(true);
                      const url = await uploadImageSecurely(f);
                      completeWizardWithImage(url, desc);
                    } catch (err: any) {
                      addMessage({
                        sender: 'bot',
                        text: `Upload error: ${err.message}. Proceeding without image.`,
                      });
                      completeWizardWithoutImage(desc);
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                };
                fileInputRef.current.click();
              }
            },
          },
          {
            label: 'Skip Image for now',
            action: () => completeWizardWithoutImage(desc),
          },
        ],
      });
      return;
    }

    if (wizardStep === 5) {
      if (file) {
        try {
          setIsProcessing(true);
          const url = await uploadImageSecurely(file);
          completeWizardWithImage(url, wizardData.description || '');
        } catch (err: any) {
          addMessage({ sender: 'bot', text: `Upload error: ${err.message}. Proceeding without image.` });
          completeWizardWithoutImage(wizardData.description || '');
        } finally {
          setIsProcessing(false);
        }
      } else {
        completeWizardWithoutImage(wizardData.description || '');
      }
    }
  };

  const completeWizardWithImage = (imageUrl: string, desc: string) => {
    const finalItem: Partial<MenuItem> = {
      ...wizardData,
      description: desc,
      image: imageUrl,
      isVeg: true,
      isAvailable: true,
      preparationTime: '10 mins',
    };
    setWizardStep(null);
    setWizardData({});
    showNewItemProposal(finalItem);
  };

  const completeWizardWithoutImage = (desc: string) => {
    const finalItem: Partial<MenuItem> = {
      ...wizardData,
      description: desc,
      image: '',
      isVeg: true,
      isAvailable: true,
      preparationTime: '10 mins',
    };
    setWizardStep(null);
    setWizardData({});
    showNewItemProposal(finalItem);
  };

  const showNewItemProposal = (item: Partial<MenuItem>) => {
    addMessage({
      sender: 'bot',
      text: '📋 Review New Menu Item Preview:',
      proposal: {
        type: 'add_item',
        itemName: item.name,
        newItemData: item,
      },
    });
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: '✨ Chat cleared. How can I assist you with the Namahaa menu?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setWizardStep(null);
    setWizardData({});
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-namaha-green-deep to-namaha-green-dark border border-namaha-gold/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-namaha-gold/20 text-namaha-gold border border-namaha-gold/40 shadow-inner">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-namaha-gold">
                🤖 Menu Assistant
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-extrabold uppercase">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Manage dishes, food photos, prices, descriptions, and categories easily with conversation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-namaha-gold text-xs font-semibold flex items-center gap-1.5 transition"
            title="Show example commands"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showHelp ? 'Hide Tips' : 'Commands Guide'}</span>
          </button>
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition"
            title="Clear Chat Conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Example Commands Collapsible Guide */}
      {showHelp && (
        <div className="p-5 rounded-2xl bg-namaha-green-dark/95 border border-namaha-gold/30 text-white text-xs space-y-3 animate-fade-in shadow-lg">
          <h3 className="font-bold text-namaha-gold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Natural Language Command Examples:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-gray-300">
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-namaha-gold block">💰 Price Updates</span>
              <p>&ldquo;Change price of Idly to ₹50&rdquo;</p>
              <p>&ldquo;Make Masala Dosa 70 rupees&rdquo;</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-namaha-gold block">🖼 Food Images</span>
              <p>&ldquo;Add an image to Pesarrattu&rdquo;</p>
              <p>&ldquo;Change image of Ravva Dosa&rdquo;</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-namaha-gold block">👁 Availability</span>
              <p>&ldquo;Make Pongal unavailable&rdquo;</p>
              <p>&ldquo;Mark Vada as available&rdquo;</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-namaha-gold block">✏️ Rename & Describe</span>
              <p>&ldquo;Rename Pesarattu to Special Pesarattu&rdquo;</p>
              <p>&ldquo;Change Vada description to Crispy Fritters&rdquo;</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-namaha-gold block">🔍 Reports & Queries</span>
              <p>&ldquo;Show items without images&rdquo;</p>
              <p>&ldquo;Show all dishes in Dosa category&rdquo;</p>
            </div>
            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-red-400 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> 🗑️ Delete Dish
              </span>
              <p>&ldquo;Delete item Vada&rdquo;</p>
              <p>&ldquo;Remove Pongal from menu&rdquo;</p>
              <p>&ldquo;Delete menu item&rdquo;</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Pills Bar */}
      <div className="p-3 rounded-2xl bg-namaha-green-dark border border-namaha-gold/20 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-namaha-gold whitespace-nowrap mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Quick Actions:
          </span>

          <button
            onClick={() => startAddItemWizard()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-namaha-gold text-namaha-green-deep font-extrabold text-xs shadow-xs hover:scale-105 transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Menu Item</span>
          </button>

          <button
            onClick={() => startDeleteItemFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500 hover:text-white border border-red-500/40 text-red-300 font-bold text-xs transition whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>🗑️ Delete Item</span>
          </button>

          <button
            onClick={() => startImageFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <ImageIcon className="w-3.5 h-3.5 text-namaha-gold" />
            <span>🖼 Add / Change Image</span>
          </button>

          <button
            onClick={() => startRenameFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <Edit3 className="w-3.5 h-3.5 text-namaha-gold" />
            <span>✏️ Rename Item</span>
          </button>

          <button
            onClick={() => startPriceFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <DollarSign className="w-3.5 h-3.5 text-namaha-gold" />
            <span>💰 Change Price</span>
          </button>

          <button
            onClick={() => startDescriptionFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <Tag className="w-3.5 h-3.5 text-namaha-gold" />
            <span>📝 Edit Description</span>
          </button>

          <button
            onClick={() => startCategoryFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <FolderTree className="w-3.5 h-3.5 text-namaha-gold" />
            <span>📂 Change Category</span>
          </button>

          <button
            onClick={() => startAvailabilityFlow()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5 text-namaha-gold" />
            <span>👁 Availability</span>
          </button>

          <button
            onClick={() => handleSendMessage('Show items without images')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>🔍 Find Missing Images</span>
          </button>

          <button
            onClick={() => handleSendMessage('View Menu')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white border border-white/10 font-bold text-xs transition whitespace-nowrap"
          >
            <Utensils className="w-3.5 h-3.5 text-namaha-gold" />
            <span>📋 View Menu</span>
          </button>
        </div>
      </div>

      {/* Main Chatbox Window */}
      <div className="bg-namaha-green-dark/95 border border-namaha-gold/25 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[620px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start ${isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-full bg-namaha-gold text-namaha-green-deep flex items-center justify-center font-bold text-xs shadow-md flex-shrink-0 mt-0.5">
                    🤖
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl shadow-md text-sm ${
                      isBot
                        ? 'bg-namaha-green-deep/90 border border-namaha-gold/20 text-gray-100 rounded-tl-none'
                        : 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-semibold rounded-tr-none shadow-namaha-gold'
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Attached Image Thumbnail */}
                    {msg.imagePreview && (
                      <div className="mt-3 relative w-48 h-36 rounded-xl overflow-hidden border-2 border-namaha-gold/40 shadow-md">
                        <Image
                          src={msg.imagePreview}
                          alt="Attached Food Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>

                  {/* Proposal Confirmation Box */}
                  {msg.proposal && !msg.proposal.confirmed && !msg.proposal.cancelled && (
                    <div className="p-4 rounded-2xl bg-black/50 border-2 border-namaha-gold/40 shadow-xl space-y-3">
                      <div className="flex items-center gap-2 text-namaha-gold font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Action Confirmation Required</span>
                      </div>

                      {/* Proposal Details Table */}
                      <div className="text-xs space-y-1.5 text-gray-200 bg-white/5 p-3 rounded-xl border border-white/5">
                        {msg.proposal.type === 'change_price' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dish:</span>
                              <span className="font-bold text-white">{msg.proposal.itemName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Current Price:</span>
                              <span className="text-red-300 font-bold line-through">₹{msg.proposal.oldValue}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New Price:</span>
                              <span className="text-emerald-400 font-extrabold text-sm">₹{msg.proposal.newValue}</span>
                            </div>
                          </>
                        )}

                        {msg.proposal.type === 'rename_item' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Current Name:</span>
                              <span className="text-red-300 font-bold">{msg.proposal.oldValue}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New Name:</span>
                              <span className="text-emerald-400 font-bold">{msg.proposal.newValue}</span>
                            </div>
                          </>
                        )}

                        {msg.proposal.type === 'toggle_availability' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dish:</span>
                              <span className="font-bold text-white">{msg.proposal.itemName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New Status:</span>
                              <span className={`font-bold ${msg.proposal.newValue ? 'text-emerald-400' : 'text-red-400'}`}>
                                {msg.proposal.newValue ? '🟢 Active & Available' : '🔴 Out of Stock / Unavailable'}
                              </span>
                            </div>
                          </>
                        )}

                        {msg.proposal.type === 'change_image' && (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Target Dish:</span>
                              <span className="font-bold text-white">{msg.proposal.itemName}</span>
                            </div>
                            <div className="text-gray-400">
                              Upload and save to Supabase Storage bucket <code className="text-namaha-gold">food-images</code>.
                            </div>
                          </div>
                        )}

                        {msg.proposal.type === 'change_category' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dish:</span>
                              <span className="font-bold text-white">{msg.proposal.itemName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">New Category:</span>
                              <span className="text-namaha-gold font-bold">{msg.proposal.newValue}</span>
                            </div>
                          </>
                        )}

                        {msg.proposal.type === 'change_description' && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Dish:</span>
                              <span className="font-bold text-white">{msg.proposal.itemName}</span>
                            </div>
                            <div className="pt-1">
                              <span className="text-gray-400 block mb-0.5">New Description:</span>
                              <p className="text-white italic">&ldquo;{msg.proposal.newValue}&rdquo;</p>
                            </div>
                          </>
                        )}

                        {msg.proposal.type === 'delete_item' && (
                          <div className="space-y-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200">
                            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              <span>Delete Confirmation Required</span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-200 pt-0.5">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Dish:</span>
                                <span className="font-bold text-white">{msg.proposal.itemName}</span>
                              </div>
                              {msg.proposal.item && (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Category:</span>
                                    <span className="text-namaha-gold font-semibold">{msg.proposal.item.categoryName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Price:</span>
                                    <span className="text-emerald-400 font-semibold">₹{msg.proposal.item.price}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <p className="text-[11px] text-red-300 italic pt-1 border-t border-red-500/20">
                              ⚠️ This action permanently deletes the dish and its image from Supabase.
                            </p>
                          </div>
                        )}

                        {msg.proposal.type === 'add_item' && msg.proposal.newItemData && (
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Name:</span>
                              <span className="font-bold text-namaha-gold">{msg.proposal.newItemData.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Category:</span>
                              <span className="font-bold text-white">{msg.proposal.newItemData.categoryName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Price:</span>
                              <span className="font-bold text-emerald-400">₹{msg.proposal.newItemData.price}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Image Attached:</span>
                              <span className="font-bold text-white">{msg.proposal.newItemData.image ? '✓ Yes' : 'No'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirmation Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleCancelAction(msg.id)}
                          disabled={isProcessing}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmAction(msg.id, msg.proposal!)}
                          disabled={isProcessing}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                            msg.proposal.type === 'delete_item'
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-gradient-to-r from-namaha-gold to-amber-500 text-namaha-green-deep font-extrabold'
                          }`}
                        >
                          {isProcessing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {msg.proposal.type === 'delete_item'
                              ? 'Permanently Delete'
                              : msg.proposal.type === 'change_image'
                              ? 'Replace Image'
                              : msg.proposal.type === 'add_item'
                              ? 'Add Item to Supabase'
                              : 'Confirm Change'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirmed / Cancelled Status Indicator */}
                  {msg.proposal && (msg.proposal.confirmed || msg.proposal.cancelled) && (
                    <div
                      className={`text-xs px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 font-bold ${
                        msg.proposal.confirmed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {msg.proposal.confirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Action confirmed & saved to Supabase</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span>Action cancelled</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Interactive Options / Disambiguation Selection Pills */}
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={opt.action}
                          disabled={isProcessing}
                          className={`px-3.5 py-1.5 rounded-full border font-bold text-xs transition-all shadow-xs flex items-center gap-1 ${
                            opt.variant === 'danger'
                              ? 'bg-red-500/15 hover:bg-red-500 hover:text-white border-red-500/40 text-red-300'
                              : 'bg-namaha-gold/15 hover:bg-namaha-gold hover:text-namaha-green-deep border-namaha-gold/40 text-namaha-gold'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <ChevronRight className="w-3 h-3 opacity-70" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Item List Display Widget */}
                  {msg.itemList && msg.itemList.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 pt-1 max-h-72 overflow-y-auto pr-1">
                      {msg.itemList.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {item.image ? (
                              <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                                <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-white/5 border border-dashed border-amber-400/40 flex items-center justify-center text-amber-400 text-[10px] font-bold flex-shrink-0">
                                No Pic
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white truncate block text-sm">{item.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                                    item.isAvailable
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                                  }`}
                                >
                                  {item.isAvailable ? '🟢 Available' : '🔴 Out of Stock'}
                                </span>
                              </div>
                              <div className="text-gray-300 text-xs mt-0.5">
                                <span className="text-namaha-gold font-extrabold text-sm">₹{item.price}</span>
                                <span className="text-gray-400 mx-1.5">•</span>
                                <span className="text-gray-300 font-medium">{item.categoryName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Interactive Dish Actions */}
                          <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 self-end sm:self-center">
                            {/* Image Upload/Change */}
                            <button
                              onClick={() => {
                                if (fileInputRef.current) {
                                  fileInputRef.current.onchange = (e: any) => {
                                    const f = e.target.files?.[0];
                                    if (f) proposeImageChange(item, f);
                                  };
                                  fileInputRef.current.click();
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-gray-200 font-semibold text-[11px] transition flex items-center gap-1"
                              title="Upload or Change Photo"
                            >
                              <ImageIcon className="w-3 h-3 text-namaha-gold" />
                              <span>{item.image ? 'Photo' : 'Add Pic'}</span>
                            </button>

                            {/* Availability Toggle */}
                            <button
                              onClick={() => proposeAvailabilityChange(item, !item.isAvailable)}
                              className={`px-2 py-1 rounded-lg border font-semibold text-[11px] transition flex items-center gap-1 ${
                                item.isAvailable
                                  ? 'bg-amber-500/15 hover:bg-amber-500 hover:text-white border-amber-500/30 text-amber-300'
                                  : 'bg-emerald-500/15 hover:bg-emerald-500 hover:text-white border-emerald-500/30 text-emerald-300'
                              }`}
                              title={item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                            >
                              <Eye className="w-3 h-3" />
                              <span>{item.isAvailable ? 'Turn Off' : 'Turn On'}</span>
                            </button>

                            {/* Rename Item */}
                            <button
                              onClick={() => selectItemToRename(item)}
                              className="px-2 py-1 rounded-lg bg-namaha-gold/15 hover:bg-namaha-gold hover:text-namaha-green-deep border border-namaha-gold/30 text-namaha-gold font-bold text-[11px] transition flex items-center gap-1"
                              title="Rename Dish"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Rename</span>
                            </button>

                            {/* Change Price */}
                            <button
                              onClick={() => selectItemToChangePrice(item)}
                              className="px-2 py-1 rounded-lg bg-namaha-gold/15 hover:bg-namaha-gold hover:text-namaha-green-deep border border-namaha-gold/30 text-namaha-gold font-bold text-[11px] transition flex items-center gap-1"
                              title="Change Price"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Price</span>
                            </button>

                            {/* Change Category */}
                            <button
                              onClick={() => selectItemToChangeCategory(item)}
                              className="px-2 py-1 rounded-lg bg-namaha-gold/15 hover:bg-namaha-gold hover:text-namaha-green-deep border border-namaha-gold/30 text-namaha-gold font-bold text-[11px] transition flex items-center gap-1"
                              title="Move to another category"
                            >
                              <FolderTree className="w-3 h-3" />
                              <span>Move</span>
                            </button>

                            {/* Edit Description */}
                            <button
                              onClick={() => selectItemToEditDescription(item)}
                              className="px-2 py-1 rounded-lg bg-namaha-gold/15 hover:bg-namaha-gold hover:text-namaha-green-deep border border-namaha-gold/30 text-namaha-gold font-bold text-[11px] transition flex items-center gap-1"
                              title="Edit Description"
                            >
                              <Tag className="w-3 h-3" />
                              <span>Desc</span>
                            </button>

                            {/* Delete Item */}
                            <button
                              onClick={() => proposeItemDeletion(item)}
                              className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500 hover:text-white border border-red-500/40 text-red-300 font-bold text-[11px] transition flex items-center gap-1"
                              title={`Delete ${item.name}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-400 group-hover:text-white" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[10px] text-gray-500 block px-1">
                    {msg.timestamp}
                  </span>
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-namaha-green-deep flex items-center justify-center font-bold text-xs shadow-md flex-shrink-0 mt-0.5">
                    👤
                  </div>
                )}
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-namaha-gold text-namaha-green-deep flex items-center justify-center font-bold text-xs shadow-md flex-shrink-0">
                🤖
              </div>
              <div className="p-3.5 rounded-2xl bg-namaha-green-deep/90 border border-namaha-gold/20 text-namaha-gold text-xs flex items-center gap-2 shadow-md">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing command with Supabase live engine...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Section */}
        <div className="p-4 bg-black/40 border-t border-white/10">
          {/* Active Interactive Flow Banner (Rename, Price, Description) */}
          {activeFlow && (
            <div className="mb-3 flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-namaha-gold/15 border border-namaha-gold/40 text-white animate-fade-in shadow-md">
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-namaha-gold text-namaha-green-deep font-extrabold text-[10px] uppercase tracking-wider">
                  {activeFlow.type === 'rename' ? '✏️ Rename Mode' : activeFlow.type === 'price' ? '💰 Price Mode' : '📝 Description Mode'}
                </span>
                <span className="text-gray-200">
                  Editing <strong>&ldquo;{activeFlow.item.name}&rdquo;</strong> — type the new {activeFlow.type === 'rename' ? 'name' : activeFlow.type === 'price' ? 'price in ₹' : 'description'} below and press <strong>Send</strong>:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveFlow(null)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition text-xs font-semibold flex items-center gap-1 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Selected image preview chip before sending */}
          {selectedFilePreview && (
            <div className="mb-3 flex items-center justify-between p-2.5 rounded-2xl bg-namaha-green-deep border border-namaha-gold/40 max-w-sm animate-fade-in shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <Image src={selectedFilePreview} alt="Upload Thumbnail" fill className="object-cover" unoptimized />
                </div>
                <div className="min-w-0 text-xs">
                  <span className="font-bold text-white block truncate">{selectedFile?.name}</span>
                  <span className="text-[10px] text-namaha-gold">Ready to upload to Supabase</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setSelectedFilePreview(null);
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setSelectedFilePreview(URL.createObjectURL(file));
              }
            }}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Upload Image Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a food image"
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-namaha-gold border border-white/10 hover:border-namaha-gold/40 transition active:scale-95 flex-shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Main Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                activeFlow
                  ? activeFlow.type === 'rename'
                    ? `Type new name for "${activeFlow.item.name}"...`
                    : activeFlow.type === 'price'
                    ? `Type new price for "${activeFlow.item.name}" (e.g. 50)...`
                    : `Type new description for "${activeFlow.item.name}"...`
                  : "Tell Menu Assistant what to do (e.g. 'Rename Idly to Ghee Idly', 'Change price of Dosa to 70')..."
              }
              className="flex-1 py-3 px-4 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-gray-400 text-sm focus:outline-none focus:border-namaha-gold transition"
              disabled={isProcessing}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedFile) || isProcessing}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-namaha-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-namaha-green-deep font-extrabold text-sm shadow-namaha-gold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 flex-shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Secure Admin Footer Note */}
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Secure • Live Supabase Sync</span>
            </span>
            <span>Bucket: food-images</span>
          </div>
        </div>
      </div>
    </div>
  );
};
