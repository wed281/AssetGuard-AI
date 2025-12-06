import React, { useState, useEffect } from 'react';
import { dbService } from './services/db';
import { Asset, Category, ViewState, LightboxState } from './types';
import { AssetForm } from './components/AssetForm';
import { SettingsView } from './components/SettingsView';
import { 
  FolderPlus, Settings as SettingsIcon, Search, 
  MapPin, ChevronRight, Download, Plus, Trash2,
  List, AlertCircle, Menu, X, Printer, ChevronLeft
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<ViewState>('CATEGORIES');
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // Lightbox State
  const [lightbox, setLightbox] = useState<LightboxState>({ 
    isOpen: false, 
    images: [], 
    currentIndex: 0 
  });

  // Modal State for adding category
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // PDF Generation State
  const [isPdfPreview, setIsPdfPreview] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      await dbService.connect();
      loadCategories();
    };
    init();
  }, []);

  const loadCategories = async () => {
    const cats = await dbService.getAllCategories();
    setCategories(cats);
  };

  const loadAssets = async (catId: string) => {
    const assets = await dbService.getAssetsByCategory(catId);
    setAssets(assets);
  };

  const handleCategoryClick = async (category: Category) => {
    setActiveCategory(category);
    await loadAssets(category.id);
    setView('ASSET_LIST');
  };

  const handleAddCategoryClick = () => {
    setNewCategoryName('');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const newCat: Category = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: newCategoryName.trim(),
      description: ''
    };
    
    try {
      await dbService.saveCategory(newCat);
      await loadCategories();
      setShowCategoryModal(false);
    } catch (e) {
      console.error("Error saving category:", e);
      alert("新增失敗，請確認資料庫狀態");
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm("確定要刪除此目錄嗎？目錄下的資產也會無法存取。")) {
        await dbService.deleteCategory(id);
        loadCategories();
    }
  }

  const handleDeleteAsset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm("確定要刪除此資產嗎？")) {
        await dbService.deleteAsset(id);
        if(activeCategory) loadAssets(activeCategory.id);
    }
  }

  // Use html2pdf for robust PDF generation
  const handleDownloadPDF = async () => {
    // @ts-ignore
    if (typeof html2pdf === 'undefined') {
      alert("PDF 模組尚未載入，請稍後再試");
      return;
    }

    // 1. Show the PDF preview (render it visible on screen)
    setIsPdfPreview(true);

    // 2. Wait for render
    setTimeout(() => {
        const element = document.getElementById('pdf-report-content');
        if (!element) {
            setIsPdfPreview(false);
            return;
        }

        const opt = {
          margin: 0, // Zero margins to prevent overflow; we handle padding in CSS
          filename: `${activeCategory?.name || 'Asset_Report'}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // 3. Generate
        // @ts-ignore
        html2pdf().set(opt).from(element).save().then(() => {
            // 4. Hide after save
            setIsPdfPreview(false);
        }).catch((err) => {
            console.error(err);
            alert("匯出失敗");
            setIsPdfPreview(false);
        });
    }, 800); // Give it slightly more time to ensure layout stability
  };

  // Lightbox Handler
  const openLightbox = (images: string[], index: number) => {
    setLightbox({ isOpen: true, images, currentIndex: index });
  };
  
  const closeLightbox = () => {
    setLightbox(prev => ({ ...prev, isOpen: false }));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  // Filter Logic
  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.assetId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to render the main content based on view
  const renderContent = () => {
    if (view === 'ASSET_FORM' && activeCategory) {
      return (
        <AssetForm 
          categoryId={activeCategory.id}
          existingAsset={editingAsset}
          onClose={() => setView('ASSET_LIST')}
          onSave={async () => {
              await loadAssets(activeCategory.id);
              setView('ASSET_LIST');
          }}
          onViewImage={openLightbox}
        />
      );
    }

    if (view === 'SETTINGS') {
      return <SettingsView onBack={() => setView('CATEGORIES')} />;
    }

    if (view === 'ASSET_LIST' && activeCategory) {
      return (
        <>
           <header className="bg-white shadow-sm sticky top-0 z-10 flex flex-col">
             <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center">
                    <button 
                        onClick={() => setView('CATEGORIES')}
                        className="mr-2 -ml-2 p-2 rounded-full hover:bg-gray-100"
                    >
                        <ChevronRight className="w-6 h-6 rotate-180 text-gray-600" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800 truncate max-w-[200px]">{activeCategory.name}</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isPdfPreview}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full flex items-center gap-1"
                        title="下載 PDF"
                    >
                        {isPdfPreview ? (
                            <span className="text-xs font-bold animate-pulse">處理中...</span>
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </button>
                    <button 
                        onClick={() => {
                            setEditingAsset(undefined);
                            setView('ASSET_FORM');
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center shadow-md active:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-1" /> 新增
                    </button>
                </div>
             </div>
             
             {/* Search Bar */}
             <div className="px-4 py-2 bg-gray-50 border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="搜尋編號、名稱或地點..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
             </div>
           </header>

           <main className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-100 pb-20">
                {filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                        <p>此目錄尚無資產</p>
                    </div>
                ) : (
                    filteredAssets.map(asset => (
                        <div 
                            key={asset.id} 
                            onClick={() => {
                                setEditingAsset(asset);
                                setView('ASSET_FORM');
                            }}
                            className="bg-white rounded-lg shadow-sm overflow-hidden flex h-28 active:scale-[0.99] transition-transform"
                        >
                            {/* Left: Thumbnail */}
                            <div 
                              className="w-28 bg-gray-200 flex-shrink-0 relative cursor-zoom-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (asset.photos && asset.photos.length > 0) openLightbox(asset.photos, 0);
                              }}
                            >
                                {asset.photos && asset.photos.length > 0 ? (
                                    <img src={asset.photos[0]} className="w-full h-full object-cover" alt="Asset" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <div className="text-xs">No Photo</div>
                                    </div>
                                )}
                                {asset.photos && asset.photos.length > 1 && (
                                  <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded-full">
                                    +{asset.photos.length - 1}
                                  </div>
                                )}
                            </div>

                            {/* Right: Info */}
                            <div className="flex-1 p-3 flex flex-col justify-between min-w-0 relative">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-gray-900 truncate mr-2 text-sm">{asset.name}</h3>
                                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            {asset.assetId}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        SN: <span className="font-mono">{asset.serialNumber || '-'}</span>
                                    </p>
                                </div>
                                
                                <div className="flex items-end justify-between mt-2">
                                    <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded max-w-[70%]">
                                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{asset.location || '未指定位置'}</span>
                                    </div>
                                    
                                    {asset.note && (
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mb-2 mr-2" title="有備註" />
                                    )}
                                </div>

                                <button 
                                    onClick={(e) => handleDeleteAsset(e, asset.id)}
                                    className="absolute bottom-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
           </main>
        </>
      );
    }

    // Default: Categories View
    return (
      <>
        <header className="bg-white px-4 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
          <h1 className="text-xl font-extrabold text-blue-900 flex items-center">
            <List className="w-6 h-6 mr-2 text-blue-600" />
            資產盤點目錄
          </h1>
          <button 
            onClick={() => setView('SETTINGS')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
          >
            <SettingsIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4">
            {categories.map(cat => (
              <div 
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4 text-blue-600">
                    <FolderPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{cat.name}</h3>
                    <p className="text-sm text-gray-500">{cat.description || '點擊進入盤點'}</p>
                  </div>
                </div>
                <div className="flex items-center">
                    <button 
                      onClick={(e) => handleDeleteCategory(e, cat.id)}
                      className="mr-3 p-2 text-gray-300 hover:text-red-500"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <ChevronRight className="text-gray-400 w-5 h-5" />
                </div>
              </div>
            ))}
            
            <button 
              onClick={handleAddCategoryClick}
              className="border-2 border-dashed border-gray-300 p-4 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-medium">新增目錄 / 盤點專案</span>
            </button>
          </div>
        </main>
      </>
    );
  };

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 font-sans relative">
        {renderContent()}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all">
                <h3 className="text-xl font-bold mb-2 text-gray-800">新增盤點目錄</h3>
                <p className="text-sm text-gray-500 mb-4">請輸入新的分類或盤點區域名稱</p>
                
                <input 
                  autoFocus
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg p-3 mb-6 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="例如：3F 會議室"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                />
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setShowCategoryModal(false)}
                     className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors"
                   >
                     取消
                   </button>
                   <button 
                     onClick={handleSaveCategory}
                     disabled={!newCategoryName.trim()}
                     className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors"
                   >
                     建立
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Lightbox Modal (Always available at root) */}
        {lightbox.isOpen && (
          <div 
            className="fixed inset-0 bg-black z-[999] flex items-center justify-center lightbox-enter lightbox-enter-active"
            onClick={closeLightbox}
          >
             <button 
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white p-2 bg-white/20 rounded-full hover:bg-white/40 z-20"
             >
               <X className="w-8 h-8" />
             </button>

             {/* Navigation */}
             {lightbox.images.length > 1 && (
               <>
                 <button 
                   onClick={prevImage}
                   className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 bg-white/20 rounded-full hover:bg-white/40 z-20"
                 >
                   <ChevronLeft className="w-8 h-8" />
                 </button>
                 <button 
                   onClick={nextImage}
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 bg-white/20 rounded-full hover:bg-white/40 z-20"
                 >
                   <ChevronRight className="w-8 h-8" />
                 </button>
               </>
             )}

             {/* Indicator */}
             {lightbox.images.length > 1 && (
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                 {lightbox.currentIndex + 1} / {lightbox.images.length}
               </div>
             )}

             {lightbox.images[lightbox.currentIndex] && (
               <img 
                 src={lightbox.images[lightbox.currentIndex]} 
                 className="max-w-full max-h-full object-contain p-2" 
                 alt="Full size"
               />
             )}
          </div>
        )}

        {/* PDF Preview Overlay (Visible during generation) */}
        {isPdfPreview && activeCategory && (
            <div className="fixed inset-0 z-[200] bg-white overflow-auto flex justify-center">
                <div 
                  id="pdf-report-content" 
                  className="bg-white w-[210mm] p-[15mm] text-gray-900 box-border"
                >
                    
                    {/* Header */}
                    <div className="mb-6 pb-4 border-b-2 border-gray-800 flex justify-between items-end">
                      <div>
                        <h1 className="text-3xl font-extrabold tracking-wide mb-1">資產盤點清單</h1>
                        <p className="text-gray-600 font-medium">分類目錄: <span className="text-black">{activeCategory.name}</span></p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                         <div>匯出日期: {new Date().toLocaleDateString('zh-TW')}</div>
                         <div>一般資產</div>
                      </div>
                    </div>

                    {/* Table - Fixed layout to prevent overflow */}
                    <table className="w-full border-collapse border border-gray-400 text-sm table-fixed">
                      <thead>
                        <tr className="bg-gray-100 text-gray-800">
                          <th className="border border-gray-400 p-2 w-[5%] text-center">#</th>
                          <th className="border border-gray-400 p-2 w-[25%] text-left">照片紀錄</th>
                          <th className="border border-gray-400 p-2 w-[35%] text-left">資產詳細資訊</th>
                          <th className="border border-gray-400 p-2 w-[15%] text-left">位置</th>
                          <th className="border border-gray-400 p-2 w-[20%] text-left">備註</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset, index) => (
                          <tr key={asset.id} className="align-top">
                             <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                             <td className="border border-gray-400 p-2">
                                {asset.photos && asset.photos.length > 0 ? (
                                   <div className="grid grid-cols-2 gap-1">
                                     {asset.photos.slice(0, 4).map((photo, i) => (
                                       <div key={i} className="aspect-square w-full overflow-hidden border border-gray-200">
                                         <img 
                                            src={photo} 
                                            className="w-full h-full object-cover" 
                                            alt={`photo-${i}`}
                                         />
                                       </div>
                                     ))}
                                   </div>
                                ) : (
                                   <span className="text-gray-400 text-xs">- 無照片 -</span>
                                )}
                             </td>
                             <td className="border border-gray-400 p-2 break-words">
                                <div className="space-y-1">
                                   <div>
                                     <span className="font-bold text-gray-600 text-xs block">資產名稱:</span>
                                     <span className="font-bold text-lg leading-tight block">{asset.name}</span>
                                   </div>
                                   <div>
                                     <span className="font-bold text-gray-600 text-xs block">編號:</span>
                                     <span className="font-mono text-sm block">{asset.assetId}</span>
                                   </div>
                                   <div>
                                     <span className="font-bold text-gray-600 text-xs block">序號 (S/N):</span>
                                     <span className="font-mono text-gray-700 text-xs break-all block">{asset.serialNumber || 'N/A'}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="border border-gray-400 p-2 break-words">
                                {asset.location}
                             </td>
                             <td className="border border-gray-400 p-2 text-gray-600 break-words text-xs">
                                {asset.note}
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                      <div>Generated by Smart Asset Inventory</div>
                      <div>本頁共計: <span className="text-black font-bold">{assets.length}</span> 筆資產</div>
                    </div>

                </div>
            </div>
        )}

      </div>
    </>
  );
}