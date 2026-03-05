/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PenTool, 
  Image as ImageIcon, 
  Palette, 
  Briefcase, 
  Plus, 
  Search, 
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowRight,
  X,
  Upload,
  MapPin,
  Save,
  Copy,
  Check,
  ExternalLink,
  Info,
  Moon,
  Sun,
  FileText,
  DollarSign,
  User,
  Award,
  Download,
  Printer,
  Settings,
  Menu,
  Compass,
  Maximize,
  Maximize2,
  Layers,
  GitBranch,
  Filter,
  ArrowUpDown,
  Zap,
  Eye,
  EyeOff,
  Scale,
  Smile,
  Layout,
  Building2,
  Droplets,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Users,
  TrendingUp,
  PieChart as PieChartIcon,
  PlusCircle,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Share2,
  BookOpen,
  ShieldCheck,
  Globe,
  LogOut,
  LogIn,
  History,
  Target,
  Zap as ZapIcon,
  Star
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import Markdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { cn } from './lib/utils';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  generateProjectConcept, 
  generateVisualConcept, 
  getMarketEstimate,
  analyzeClientWithAI,
  generateSuggestedPrompt,
  ProjectBrief, 
  ConceptResult,
  ClientAnalysis
} from './services/aiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { ConceptViewer } from './components/ConceptViewer';
import { Moodboard } from './components/Moodboard';
import { ConceptLab } from './components/ConceptLab';
import { getCityHallRegulations, CityHallRegulation } from './services/cityHallService';

type View = 'dashboard' | 'briefing' | 'budget' | 'design-guide' | 'mind-map' | 'regulations' | 'settings' | 'moodboard' | 'concept-lab' | 'executive' | 'gallery' | 'clients' | 'financial' | 'brandbook' | 'playbook';

interface BudgetItem {
  id: string;
  category: string;
  description: string;
  cost: number;
  professionalPrice?: number;
  marketEstimate?: number;
  type: 'material' | 'labor' | 'other';
  stage?: string;
}

interface ProjectStage {
  id: string;
  label: string;
  agreedDate: string;
  completedDate?: string;
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  project: string;
  lastContact: string;
  value: number;
  stage: string;
  priority: string;
  timeline: { date: string; type: string; text: string }[];
  payment?: {
    method: string;
    installments: number;
    dueDate: number; // Day of the month
  };
  projectStages?: ProjectStage[];
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentConcept, setCurrentConcept] = useState<ConceptResult | null>(null);
  const [visualUrl, setVisualUrl] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLightingTips, setShowLightingTips] = useState(false);
  const [showGoldenRatio, setShowGoldenRatio] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [paletteGrouping, setPaletteGrouping] = useState<'none' | 'hue' | 'purpose'>('none');
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationStep, setPresentationStep] = useState(0);

  const presentationItems = currentConcept ? [
    { title: 'Conceito Geral', content: currentConcept.description, icon: <Sparkles className="w-8 h-8" /> },
    { title: 'Neuroarquitetura', content: currentConcept.neuroscienceAnalysis?.cognitiveImpact, icon: <Zap className="w-8 h-8" /> },
    { title: 'Estratégia Sensorial', content: currentConcept.neuroscienceAnalysis?.sensoryStrategy, icon: <Smile className="w-8 h-8" /> },
    { title: 'Biofilia & Bem-estar', content: currentConcept.neuroscienceAnalysis?.biophilicAdvice, icon: <Droplets className="w-8 h-8" /> },
    { title: 'Materiais & Texturas', content: currentConcept.materials.join(', '), icon: <Layers className="w-8 h-8" /> },
    { title: 'Iluminação', content: currentConcept.lightingStrategy, icon: <Sun className="w-8 h-8" /> }
  ] : [];

  const nextPresentationStep = () => {
    if (presentationStep < presentationItems.length - 1) {
      setPresentationStep(presentationStep + 1);
    } else {
      setPresentationMode(false);
      setPresentationStep(0);
    }
  };
  
  // Dashboard filtering/sorting state
  const [filterType, setFilterType] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [dashboardChecklist, setDashboardChecklist] = useState([
    { id: '1', label: 'Definir Briefing', done: true },
    { id: '2', label: 'Gerar Conceito IA', done: false },
    { id: '3', label: 'Aprovar Moodboard', done: false },
    { id: '4', label: 'Detalhamento Técnico', done: false },
  ]);

  // Budget state
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    { id: '1', category: 'Fundação', description: 'Concreto e Aço', cost: 15000, professionalPrice: 14500, marketEstimate: 15500, type: 'material', stage: 'Infraestrutura' },
    { id: '2', category: 'Mão de Obra', description: 'Equipe de Alvenaria', cost: 12000, professionalPrice: 12500, marketEstimate: 11800, type: 'labor', stage: 'Alvenaria' },
    { id: '3', category: 'Acabamento', description: 'Pisos e Revestimentos', cost: 8500, professionalPrice: 8200, marketEstimate: 9000, type: 'material', stage: 'Acabamento' },
    { id: '4', category: 'Instalações', description: 'Elétrica e Hidráulica', cost: 6000, professionalPrice: 5800, marketEstimate: 6200, type: 'other', stage: 'Instalações' },
  ]);

  // City Hall state
  const [cityHallData, setCityHallData] = useState<CityHallRegulation | null>(null);
  const [cityHallLoading, setCityHallLoading] = useState(false);
  const [citySearch, setCitySearch] = useState({ city: '', state: '' });

  // CRM & Financial State
  const [clients, setClients] = useState<Client[]>([
    { 
      id: '1', 
      name: 'João Silva', 
      email: 'joao@email.com', 
      phone: '(11) 98888-7777', 
      status: 'Ativo', 
      project: 'Residência Lagoa', 
      lastContact: '2024-03-01', 
      value: 45000, 
      stage: 'Executivo', 
      priority: 'Alta',
      timeline: [
        { date: '2024-03-01', type: 'call', text: 'Reunião de alinhamento técnico concluída.' },
        { date: '2024-02-25', type: 'email', text: 'Enviado detalhamento de marcenaria para aprovação.' }
      ],
      payment: {
        method: 'Parcelado',
        installments: 10,
        dueDate: 10
      },
      projectStages: [
        { id: '1', label: 'Briefing', agreedDate: '2024-01-15', status: 'Concluído', completedDate: '2024-01-14' },
        { id: '2', label: 'Conceito', agreedDate: '2024-02-10', status: 'Concluído', completedDate: '2024-02-12' },
        { id: '3', label: 'Executivo', agreedDate: '2024-03-20', status: 'Em Andamento' }
      ]
    },
    { 
      id: '2', 
      name: 'Maria Santos', 
      email: 'maria@email.com', 
      phone: '(21) 97777-6666', 
      status: 'Lead', 
      project: 'Apartamento Loft', 
      lastContact: '2024-02-28', 
      value: 12000, 
      stage: 'Briefing', 
      priority: 'Média',
      timeline: [
        { date: '2024-02-28', type: 'meeting', text: 'Primeira conversa sobre o briefing do loft.' }
      ]
    },
    { 
      id: '3', 
      name: 'Construtora Alpha', 
      email: 'contato@alpha.com', 
      phone: '(11) 3333-4444', 
      status: 'Negociação', 
      project: 'Edifício Corporate', 
      lastContact: '2024-03-02', 
      value: 150000, 
      stage: 'Conceito', 
      priority: 'Alta',
      timeline: [
        { date: '2024-03-02', type: 'proposal', text: 'Proposta comercial enviada para análise da diretoria.' }
      ]
    },
    { 
      id: '4', 
      name: 'Roberto Lima', 
      email: 'roberto@email.com', 
      phone: '(11) 96666-5555', 
      status: 'Ativo', 
      project: 'Casa de Campo', 
      lastContact: '2024-03-04', 
      value: 35000, 
      stage: 'Acompanhamento', 
      priority: 'Baixa',
      timeline: [
        { date: '2024-03-04', type: 'visit', text: 'Visita ao terreno para marcação de gabarito.' }
      ]
    },
  ]);

  const [financialTransactions, setFinancialTransactions] = useState([
    { id: '1', date: '2024-03-01', description: 'Honorários Projeto Lagoa', category: 'Receita', amount: 15000, type: 'income', project: 'Residência Lagoa' },
    { id: '2', date: '2024-03-02', description: 'Software Subscription', category: 'Software', amount: 250, type: 'expense' },
    { id: '3', date: '2024-03-03', description: 'Aluguel Escritório', category: 'Infraestrutura', amount: 3500, type: 'expense' },
    { id: '4', date: '2024-02-25', description: 'Consultoria Técnica', category: 'Serviços', amount: 2000, type: 'expense', project: 'Edifício Corporate' },
    { id: '5', date: '2024-02-20', description: 'Parcela Projeto Loft', category: 'Receita', amount: 8000, type: 'income', project: 'Apartamento Loft' },
    { id: '6', date: '2024-03-05', description: 'Marketing Digital', category: 'Marketing', amount: 1200, type: 'expense' },
    { id: '7', date: '2024-03-06', description: 'Impostos Simples', category: 'Impostos', amount: 2800, type: 'expense' },
  ]);

  const totalIncome = financialTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = financialTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const expenseCategories = financialTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  
  const pieData = Object.keys(expenseCategories).map(cat => ({
    name: cat,
    value: expenseCategories[cat]
  }));

  const [clientSearch, setClientSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('Todos');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [crmView, setCrmView] = useState<'table' | 'kanban'>('table');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clientAnalysis, setClientAnalysis] = useState<ClientAnalysis | null>(null);
  const [isAnalyzingClient, setIsAnalyzingClient] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Brandbook & Playbook State
  const [brandbook, setBrandbook] = useState<any | null>(null);
  const [playbookPhases, setPlaybookPhases] = useState([
    { 
      title: 'Fase 1: Preparação', 
      items: [
        { text: 'Limpeza do terreno', status: 'Concluído' },
        { text: 'Instalação do canteiro', status: 'Concluído' },
        { text: 'Marcação de gabarito', status: 'Concluído' }
      ],
      status: 'Concluído',
      color: 'emerald'
    },
    { 
      title: 'Fase 2: Estrutura', 
      items: [
        { text: 'Fundação profunda', status: 'Em Andamento' },
        { text: 'Laje do térreo', status: 'Pendente' },
        { text: 'Pilares e vigas', status: 'Pendente' }
      ],
      status: 'Em andamento',
      color: 'brand-accent'
    },
    { 
      title: 'Fase 3: Alvenaria', 
      items: [
        { text: 'Paredes externas', status: 'Pendente' },
        { text: 'Divisórias internas', status: 'Pendente' },
        { text: 'Vergas e contra-vergas', status: 'Pendente' }
      ],
      status: 'Pendente',
      color: 'brand-ink'
    },
    { 
      title: 'Fase 4: Acabamento', 
      items: [
        { text: 'Revestimentos', status: 'Pendente' },
        { text: 'Pintura', status: 'Pendente' },
        { text: 'Mobiliário fixo', status: 'Pendente' }
      ],
      status: 'Pendente',
      color: 'brand-ink'
    }
  ]);
  const [generatingBrand, setGeneratingBrand] = useState(false);

  const updateItemStatus = (phaseIdx: number, itemIdx: number, newStatus: string) => {
    setPlaybookPhases(prev => {
      const newPhases = JSON.parse(JSON.stringify(prev));
      newPhases[phaseIdx].items[itemIdx].status = newStatus;
      
      // Update phase status based on items
      const allCompleted = newPhases[phaseIdx].items.every((i: any) => i.status === 'Concluído');
      const anyInProgress = newPhases[phaseIdx].items.some((i: any) => i.status === 'Em Andamento' || i.status === 'Concluído');
      
      if (allCompleted) {
        newPhases[phaseIdx].status = 'Concluído';
        newPhases[phaseIdx].color = 'emerald';
      } else if (anyInProgress) {
        newPhases[phaseIdx].status = 'Em andamento';
        newPhases[phaseIdx].color = 'brand-accent';
      } else {
        newPhases[phaseIdx].status = 'Pendente';
        newPhases[phaseIdx].color = 'brand-ink';
      }
      
      return newPhases;
    });
  };

  // Auth Effect
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      // Simulate a local user if Firebase is not configured
      setUser({
        uid: 'local-user',
        displayName: 'Arquiteto Local',
        email: 'local@archimind.com',
        photoURL: null
      } as any);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Projects Sync Effect
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    if (!isFirebaseConfigured || !db) return;

    const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    if (!isFirebaseConfigured || !auth) {
      alert("Firebase não configurado. Por favor, defina as variáveis de ambiente VITE_FIREBASE_*");
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setActiveView('dashboard');
      return;
    }
    try {
      await signOut(auth);
      setActiveView('dashboard');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleShare = async (project: any) => {
    const shareData = {
      title: `Projeto: ${project.clientName}`,
      text: `Confira o conceito visual do projeto ${project.clientName} criado no ArchiMind!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to email
        window.location.href = `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n' + shareData.url)}`;
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleAnalyzeClient = async (client: any) => {
    setIsAnalyzingClient(true);
    setClientAnalysis(null);
    try {
      const analysis = await analyzeClientWithAI(client);
      setClientAnalysis(analysis);
    } catch (error) {
      console.error("Erro ao analisar cliente:", error);
    } finally {
      setIsAnalyzingClient(false);
    }
  };

  const toggleFavorite = (imageUrl: string) => {
    setFavorites(prev => 
      prev.includes(imageUrl) 
        ? prev.filter(url => url !== imageUrl) 
        : [...prev, imageUrl]
    );
  };

  // Helper to calculate contrast ratio (simplified)
  const getContrastRatio = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 0.5 ? 'dark' : 'light';
  };

  const generatePDFReport = (project: any) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text('Relatório de Projeto ArchiMind AI', margin, y);
    y += 15;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, margin, y);
    y += 20;

    // Professional Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Profissional:', margin, y);
    doc.setFontSize(12);
    doc.text(`${professionalInfo.name} (${professionalInfo.registration})`, margin + 30, y);
    y += 15;

    // Project Details
    doc.setFontSize(14);
    doc.text('Detalhes do Projeto:', margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Cliente: ${project.clientName}`, margin + 5, y); y += 7;
    doc.text(`Tipo: ${project.projectType}`, margin + 5, y); y += 7;
    doc.text(`Localização: ${project.location.city}, ${project.location.state}`, margin + 5, y); y += 15;

    // DWG Files
    if (project.dwgFiles && project.dwgFiles.length > 0) {
      doc.setFontSize(14);
      doc.text('Arquivos Técnicos (.DWG):', margin, y);
      y += 10;
      doc.setFontSize(10);
      project.dwgFiles.forEach((f: any) => {
        doc.text(`• ${f.name} (${f.size})`, margin + 5, y);
        y += 6;
      });
      y += 10;
    }

    // AI Analysis (if available)
    if (project.neuroscience) {
      doc.setFontSize(14);
      doc.text('Análise Técnica IA:', margin, y);
      y += 10;
      doc.setFontSize(10);
      doc.text(`• Objetivo Cognitivo: ${project.neuroscience.cognitiveGoal}`, margin + 5, y); y += 6;
      doc.text(`• Estímulo Sensorial: ${project.neuroscience.sensoryStimuli}`, margin + 5, y); y += 6;
      doc.text(`• Biofilia: ${project.neuroscience.biophiliaLevel}`, margin + 5, y); y += 10;
    }

    // Financial Summary
    doc.setFontSize(14);
    doc.text('Resumo Financeiro:', margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text('Honorários de Criação: R$ 4.500,00', margin + 5, y); y += 7;
    doc.text('Detalhamento Técnico: R$ 3.200,00', margin + 5, y); y += 7;
    doc.setFontSize(12);
    doc.text('Total: R$ 7.700,00', margin + 5, y + 5);
    y += 25;

    // Materials (if available)
    if (project.concept?.materials) {
      doc.setFontSize(14);
      doc.text('Materiais Sugeridos:', margin, y);
      y += 10;
      doc.setFontSize(10);
      project.concept.materials.slice(0, 5).forEach((m: string) => {
        doc.text(`• ${m}`, margin + 5, y);
        y += 6;
      });
    }

    doc.save(`Relatorio_${project.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  const generateStructuredBrief = (project: any) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    doc.setFontSize(22);
    doc.text('Briefing Estruturado ArchiMind', margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.text(`Projeto: ${project.clientName}`, margin, y);
    y += 10;
    doc.text(`Cliente: ${project.clientName}`, margin, y);
    y += 10;
    doc.text(`Tipo: ${project.projectType}`, margin, y);
    y += 10;
    doc.text(`Estilos: ${project.styles?.join(', ')}`, margin, y);
    y += 15;

    if (project.dwgFiles && project.dwgFiles.length > 0) {
      doc.setFontSize(16);
      doc.text('Arquivos Técnicos Anexados:', margin, y);
      y += 10;
      doc.setFontSize(10);
      project.dwgFiles.forEach((f: any) => {
        doc.text(`• ${f.name} (${f.size})`, margin, y);
        y += 6;
      });
      y += 15;
    }

    doc.setFontSize(16);
    doc.text('Análise Técnica Automática (IA):', margin, y);
    y += 10;
    doc.setFontSize(10);
    const aiAnalysis = `Com base no perfil de ${project.clientName}, a ArchiMind AI identifica uma forte inclinação para o estilo ${project.styles?.[0] || 'contemporâneo'}. A topografia ${project.terrain?.slope.toLowerCase() || 'plana'} sugere uma fundação otimizada. O objetivo de ${project.neuroscience?.cognitiveGoal.toLowerCase() || 'bem-estar'} será potencializado através de estratégias sensoriais específicas.`;
    const splitAI = doc.splitTextToSize(aiAnalysis, 170);
    doc.text(splitAI, margin, y);
    y += (splitAI.length * 5) + 15;

    doc.setFontSize(16);
    doc.text('Requisitos e Desejos:', margin, y);
    y += 10;
    doc.setFontSize(10);
    const splitReqs = doc.splitTextToSize(project.requirements || 'Nenhum requisito especificado.', 170);
    doc.text(splitReqs, margin, y);
    y += (splitReqs.length * 5) + 10;

    doc.setFontSize(16);
    doc.text('Análise do Público-Alvo:', margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(project.targetAudience || 'Não especificado.', margin, y);
    y += 15;

    doc.setFontSize(16);
    doc.text('Localização:', margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`${project.location.city}, ${project.location.state}, ${project.location.country}`, margin, y);

    doc.save(`Briefing_${project.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  const [projectPage, setProjectPage] = useState(1);
  const projectsPerPage = 10;

  const filteredProjects = projects
    .filter(p => filterType === 'Todos' || p.projectType === filterType)
    .sort((a, b) => {
      const valA = sortBy === 'date' ? a.date : a.clientName;
      const valB = sortBy === 'date' ? b.date : b.clientName;
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (projectPage - 1) * projectsPerPage,
    projectPage * projectsPerPage
  );

  useEffect(() => {
    setProjectPage(1);
  }, [filterType, sortBy, sortOrder]);

  const [professionalInfo, setProfessionalInfo] = useState({
    name: 'Arquiteto Design',
    logo: null as string | null,
    signature: null as string | null,
    registration: 'CAU A12345-6'
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const [brief, setBrief] = useState<ProjectBrief>({
    clientName: '',
    projectType: 'Residencial',
    styles: [],
    budget: 'Médio-Alto',
    requirements: '',
    targetAudience: '',
    imageReferences: '',
    uploadedImages: [],
    location: {
      city: '',
      state: '',
      country: 'Brasil'
    },
    dwgFiles: [],
    terrain: {
      slope: 'Plano',
      orientation: 'Norte',
      soilType: 'Visual: Firme/Seco',
      idealElevation: '0.00m',
      perimeter: { length: '', width: '', isIrregular: false },
      levelQuotes: ''
    },
    neuroscience: {
      cognitiveGoal: 'Criatividade',
      sensoryStimuli: 'Equilibrado',
      formPreference: 'Misto',
      biophiliaLevel: 'Integrado'
    }
  });

  const availableStyles = [
    'Moderno', 'Clássico', 'Industrial', 'Minimalista', 'Boho', 
    'Escandinavo', 'Rústico', 'Art Déco', 'Japandi', 'Contemporâneo',
    'Vintage', 'Mid-Century Modern', 'Acabamentos Naturais', 'Geometria Pura', 'Minimalismo Escandinavo'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadProgress(10);
      const timer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(timer);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = new Image();
          img.src = reader.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

            setBrief(prev => ({
              ...prev,
              uploadedImages: [...(prev.uploadedImages || []), compressedDataUrl]
            }));
            setUploadProgress(100);
            setTimeout(() => setUploadProgress(0), 1000);
          };
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const toggleStyle = (style: string) => {
    setBrief(prev => ({
      ...prev,
      styles: prev.styles.includes(style) 
        ? prev.styles.filter(s => s !== style)
        : [...prev.styles, style]
    }));
  };

  const handleGenerateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generateProjectConcept(brief);
      setCurrentConcept(result);
      
      const visual = await generateVisualConcept(`${result.title}, styles: ${brief.styles.join(', ')}, materials: ${result.materials.join(', ')}`);
      setVisualUrl(visual);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = () => {
    if (!currentConcept) return;

    const newProject = {
      id: Date.now(),
      ...brief,
      concept: currentConcept,
      image: visualUrl,
      date: new Date().toLocaleDateString('pt-BR')
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveView('dashboard');
    setCurrentConcept(null);
    setVisualUrl(null);
    setBrief({
      clientName: '',
      projectType: 'Residencial',
      styles: [],
      budget: 'Médio-Alto',
      requirements: '',
      targetAudience: '',
      imageReferences: '',
      uploadedImages: [],
      location: { city: '', state: '', country: 'Brasil' }
    });
  };

  const handleSaveToGallery = (imageUrl: string) => {
    setGallery(prev => [imageUrl, ...prev]);
    // Optional: show a toast or notification
  };

  const handleCityHallSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citySearch.city || !citySearch.state) return;
    setCityHallLoading(true);
    try {
      const data = await getCityHallRegulations(citySearch.city, citySearch.state);
      setCityHallData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setCityHallLoading(false);
    }
  };

  const addBudgetItem = () => {
    const newItem: BudgetItem = {
      id: Math.random().toString(36).substr(2, 9),
      category: 'Nova Categoria',
      description: 'Descrição do item',
      cost: 0,
      type: 'material',
      stage: 'Planejamento'
    };
    setBudgetItems([...budgetItems, newItem]);
  };

  const updateBudgetItem = (id: string, field: keyof BudgetItem, value: any) => {
    setBudgetItems(budgetItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const fetchAIEstimate = async (itemId: string) => {
    const item = budgetItems.find(i => i.id === itemId);
    if (!item) return;
    
    setLoading(true);
    try {
      const location = brief.location.city || 'Brasil';
      const estimate = await getMarketEstimate(item.category, item.description, location);
      setBudgetItems(prev => prev.map(i => i.id === itemId ? { ...i, marketEstimate: estimate } : i));
    } catch (error) {
      console.error("Error fetching AI estimate:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeBudgetItem = (id: string) => {
    setBudgetItems(budgetItems.filter(item => item.id !== id));
  };

  const budgetTotal = budgetItems.reduce((acc, item) => acc + item.cost, 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-paper">
        <Loader2 className="w-12 h-12 text-brand-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-brand-paper p-8 text-center">
        <div className="w-20 h-20 bg-brand-accent rounded-[32px] flex items-center justify-center shadow-2xl shadow-brand-accent/20 mb-8">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-5xl font-serif font-bold mb-4 tracking-tighter">Bem-vindo ao ArchiMind</h1>
        <p className="text-brand-ink/60 max-w-md mb-12 leading-relaxed">
          A plataforma definitiva para arquitetos que buscam unir inteligência artificial, neuroarquitetura e gestão eficiente.
        </p>
        <button 
          onClick={handleLogin}
          className="bg-brand-ink text-white px-12 py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-4 hover:bg-brand-accent transition-all shadow-2xl shadow-brand-ink/20"
        >
          <LogIn className="w-5 h-5" />
          Entrar com Google
        </button>
        <p className="mt-12 text-[10px] uppercase tracking-widest font-bold text-brand-ink/20">
          Vitruvian Intelligence © 2026
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-brand-paper overflow-hidden font-sans transition-colors duration-500 relative", darkMode && "dark")}>
      {/* Architectural Background Elements - Fixed and out of flow */}
      <div className="arch-bg-pattern pointer-events-none fixed inset-0 z-0">
        <div className="fibonacci-spiral border-brand-accent/10 dark:border-brand-accent/5" />
        <div className="golden-circle border-brand-secondary/10 dark:border-brand-secondary/5" />
        
        {/* Additional Architectural Elements */}
        <svg className="absolute top-1/4 left-1/4 w-64 h-64 text-brand-accent/5 dark:text-brand-accent/2" viewBox="0 0 100 100">
          <path d="M0,50 Q50,0 100,50 T0,50" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.2" />
        </svg>

        <svg className="absolute top-1/2 right-1/4 w-96 h-96 text-brand-secondary/5 dark:text-brand-secondary/2 opacity-50" viewBox="0 0 100 100">
          <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <line x1="10" y1="10" x2="90" y2="90" stroke="currentColor" strokeWidth="0.1" />
          <line x1="90" y1="10" x2="10" y2="90" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="35.35" fill="none" stroke="currentColor" strokeWidth="0.1" />
        </svg>

        <div className="absolute bottom-0 right-0 p-12 font-display text-[12vw] font-bold opacity-5 dark:opacity-2 select-none uppercase tracking-tighter">
          Φ 1.618
        </div>
        
        <div className="absolute top-20 right-20 font-mono text-[8px] opacity-10 dark:opacity-5 rotate-90 origin-right">
          LE CORBUSIER / MODULOR / PROPORTION
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-brand-ink/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 border-r border-brand-ink/10 flex flex-col bg-brand-paper/80 backdrop-blur-md z-50 transition-transform duration-300 lg:relative lg:translate-x-0 geometric-bg",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2 text-brand-ink">
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            ArchiMind
          </h1>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden text-brand-ink/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => { setActiveView('dashboard'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Users className="w-4 h-4" />} 
            label="Clientes (CRM)" 
            active={activeView === 'clients'} 
            onClick={() => { setActiveView('clients'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<TrendingUp className="w-4 h-4" />} 
            label="Financeiro (DRE)" 
            active={activeView === 'financial'} 
            onClick={() => { setActiveView('financial'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Briefcase className="w-4 h-4" />} 
            label="Novo Briefing" 
            active={activeView === 'briefing'} 
            onClick={() => { setActiveView('briefing'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Zap className="w-4 h-4" />} 
            label="Laboratório de Conceitos" 
            active={activeView === 'concept-lab'} 
            onClick={() => { setActiveView('concept-lab'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<FileText className="w-4 h-4" />} 
            label="Orçamentos" 
            active={activeView === 'budget'} 
            onClick={() => { setActiveView('budget'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Compass className="w-4 h-4" />} 
            label="Guia de Design" 
            active={activeView === 'design-guide'} 
            onClick={() => { setActiveView('design-guide'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<GitBranch className="w-4 h-4" />} 
            label="Mapa Mental" 
            active={activeView === 'mind-map'} 
            onClick={() => { setActiveView('mind-map'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<ImageIcon className="w-4 h-4" />} 
            label="Moodboard" 
            active={activeView === 'moodboard'} 
            onClick={() => { setActiveView('moodboard'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Palette className="w-4 h-4" />} 
            label="Galeria" 
            active={activeView === 'gallery'} 
            onClick={() => { setActiveView('gallery'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Scale className="w-4 h-4" />} 
            label="Prefeitura" 
            active={activeView === 'regulations'} 
            onClick={() => { setActiveView('regulations'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Layout className="w-4 h-4" />} 
            label="Projeto Executivo" 
            active={activeView === 'executive'} 
            onClick={() => { setActiveView('executive'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<BookOpen className="w-4 h-4" />} 
            label="Brandbook" 
            active={activeView === 'brandbook'} 
            onClick={() => { setActiveView('brandbook'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<ShieldCheck className="w-4 h-4" />} 
            label="Playbook" 
            active={activeView === 'playbook'} 
            onClick={() => { setActiveView('playbook'); setMobileMenuOpen(false); }} 
          />
          <NavItem 
            icon={<Settings className="w-4 h-4" />} 
            label="Configurações" 
            active={activeView === 'settings'} 
            onClick={() => { setActiveView('settings'); setMobileMenuOpen(false); }} 
          />
        </nav>

        <div className="p-4 mx-4 mb-4 rounded-2xl bg-brand-accent/5 border border-brand-accent/10">
          <p className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">Princípios Vitruvianos</p>
          <div className="space-y-1">
            <p className="text-[10px] italic font-serif">"Firmitas, Utilitas, Venustas"</p>
            <p className="text-[8px] opacity-60">Solidez, Utilidade e Beleza.</p>
          </div>
        </div>

        <div className="p-6 border-t border-brand-ink/10 dark:border-white/10 space-y-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-brand-ink/5 hover:bg-brand-ink/10 transition-colors text-xs font-medium"
          >
            <span className="flex items-center gap-2 text-brand-ink">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          </button>
          
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-xs overflow-hidden border border-brand-accent/20">
                {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : user.displayName?.charAt(0) || 'AD'}
              </div>
              <div>
                <p className="text-xs font-semibold truncate max-w-[100px] text-brand-ink">{user.displayName || 'Arquiteto'}</p>
                <p className="text-[10px] text-brand-ink/50 truncate max-w-[100px]">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-brand-ink/40 hover:text-rose-500 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand-paper/80 backdrop-blur-lg border-t border-brand-ink/10 flex justify-around items-center p-4 z-40">
        <button 
          onClick={() => setActiveView('dashboard')}
          className={cn("flex flex-col items-center gap-1", activeView === 'dashboard' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Home</span>
        </button>
        <button 
          onClick={() => setActiveView('clients')}
          className={cn("flex flex-col items-center gap-1", activeView === 'clients' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <Users className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Clientes</span>
        </button>
        <button 
          onClick={() => setActiveView('financial')}
          className={cn("flex flex-col items-center gap-1", activeView === 'financial' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Finanças</span>
        </button>
        <button 
          onClick={() => setActiveView('briefing')}
          className={cn("flex flex-col items-center gap-1", activeView === 'briefing' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <PenTool className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Briefing</span>
        </button>
        <button 
          onClick={() => setActiveView('mind-map')}
          className={cn("flex flex-col items-center gap-1", activeView === 'mind-map' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <GitBranch className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Mapa</span>
        </button>
        <button 
          onClick={() => setActiveView('budget')}
          className={cn("flex flex-col items-center gap-1", activeView === 'budget' ? "text-brand-accent" : "text-brand-ink/40")}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Orçamentos</span>
        </button>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-1 text-brand-ink/40"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase">Mais</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto relative geometric-bg pb-20 lg:pb-0 z-10">
        {/* Mobile Header */}
        <div className="lg:hidden p-4 border-b border-brand-ink/10 bg-brand-paper/50 backdrop-blur-md flex justify-between items-center sticky top-0 z-30">
          <h1 className="text-xl font-serif font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-accent" />
            ArchiMind
          </h1>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-brand-ink/60">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Workflow Stepper */}
        <div className="hidden lg:block px-12 pt-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between glass-card p-4 rounded-3xl border border-brand-ink/5">
            {[
              { id: 'briefing', label: 'Briefing', icon: <PenTool className="w-4 h-4" /> },
              { id: 'concept-lab', label: 'Conceito', icon: <Zap className="w-4 h-4" /> },
              { id: 'moodboard', label: 'Moodboard', icon: <ImageIcon className="w-4 h-4" /> },
              { id: 'budget', label: 'Orçamento', icon: <DollarSign className="w-4 h-4" /> },
            ].map((step, i, arr) => (
              <React.Fragment key={step.id}>
                <button 
                  onClick={() => setActiveView(step.id as any)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-2 rounded-2xl transition-all duration-500",
                    activeView === step.id 
                      ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" 
                      : "text-brand-ink/40 hover:text-brand-accent"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                    activeView === step.id ? "bg-brand-accent text-white" : "bg-brand-ink/5"
                  )}>
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{step.label}</span>
                </button>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px bg-brand-ink/5 mx-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-8 md:mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                    <p className="text-brand-accent uppercase tracking-widest text-[10px] font-bold">ArchiMind Intelligence Active</p>
                  </div>
                  <h2 className="text-3xl md:text-5xl lg:text-7xl font-display font-bold tracking-tighter text-brand-ink">Seus <span className="text-brand-accent">Projetos</span></h2>
                </div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setBrief({
                        clientName: 'Conceito Rápido',
                        projectType: 'Residencial',
                        styles: ['Moderno', 'Minimalista'],
                        budget: 'Médio-Alto',
                        requirements: 'Crie um conceito rápido focado em harmonia e luz natural.',
                        targetAudience: 'Geral',
                        imageReferences: '',
                        uploadedImages: [],
                        location: { city: 'São Paulo', state: 'SP', country: 'Brasil' }
                      });
                      setActiveView('briefing');
                    }}
                    className="flex-1 md:flex-none bg-brand-paper border border-brand-ink/10 text-brand-ink px-6 md:px-8 py-3 md:py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-accent hover:text-white transition-all duration-500 shadow-xl shadow-brand-ink/5 text-[10px] md:text-xs font-bold uppercase tracking-widest"
                  >
                    <Zap className="w-4 h-4 md:w-5 md:h-5 text-brand-accent" />
                    Conceito Rápido
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView('briefing')}
                    className="flex-1 md:flex-none bg-brand-ink text-brand-paper px-6 md:px-8 py-3 md:py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-accent transition-all duration-500 shadow-xl shadow-brand-ink/10 btn-vibrant text-[10px] md:text-xs font-bold uppercase tracking-widest"
                  >
                    <Briefcase className="w-4 h-4 md:w-5 md:h-5" />
                    Iniciar Projeto
                  </motion.button>
                </div>
              </header>

              {/* Project Status & Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                <div className="lg:col-span-2 glass-card p-8 rounded-[40px] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Clock className="w-32 h-32" />
                  </div>
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30 mb-8">Cronograma Estimado</h3>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-3xl font-display font-bold tracking-tight">18 Semanas</p>
                        <p className="text-[10px] text-brand-ink/40 uppercase tracking-widest font-bold">Tempo Total Estimado</p>
                      </div>
                      <div className="text-right">
                        <p className="text-brand-accent font-bold">Etapa 2/5</p>
                        <p className="text-[10px] text-brand-ink/40 uppercase tracking-widest font-bold">Conceituação</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-brand-ink/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '35%' }}
                        className="h-full bg-brand-accent rounded-full"
                      />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {['Briefing', 'Conceito', 'Executivo', 'Aprovação', 'Obra'].map((step, i) => (
                        <div key={step} className={cn("text-center", i >= 3 && "hidden sm:block")}>
                          <div className={cn(
                            "w-full h-1 rounded-full mb-2",
                            i < 2 ? "bg-brand-accent" : "bg-brand-ink/5"
                          )} />
                          <p className={cn(
                            "text-[8px] font-bold uppercase tracking-tighter",
                            i < 2 ? "text-brand-ink" : "text-brand-ink/20"
                          )}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-[40px]">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30 mb-8">Checklist de Pendências</h3>
                  <div className="space-y-4">
                    {dashboardChecklist.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          setDashboardChecklist(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
                        }}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-ink/5 transition-colors cursor-pointer group"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                          item.done ? "bg-brand-secondary border-brand-secondary text-white" : "border-brand-ink/10 group-hover:border-brand-accent"
                        )}>
                          {item.done && <Check className="w-3 h-3" />}
                        </div>
                        <span className={cn(
                          "text-xs font-medium",
                          item.done ? "text-brand-ink/40 line-through" : "text-brand-ink"
                        )}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
                <div className="xl:col-span-3 space-y-12">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30">Galeria de Conceitos</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-brand-paper border border-brand-ink/5 rounded-xl px-4 py-2 text-xs shadow-sm">
                        <Filter className="w-4 h-4 text-brand-ink/20" />
                        <select 
                          value={filterType} 
                          onChange={e => setFilterType(e.target.value)}
                          className="bg-transparent focus:outline-none cursor-pointer font-semibold"
                        >
                          <option>Todos</option>
                          <option>Residencial</option>
                          <option>Comercial</option>
                          <option>Corporativo</option>
                          <option>Hospitalidade</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredProjects.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card rounded-[48px] p-24 text-center border-dashed border-2"
                    >
                      <div className="w-24 h-24 bg-brand-paper dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
                        <PenTool className="w-10 h-10 text-brand-ink/10" />
                      </div>
                      <h3 className="text-3xl font-display font-bold mb-4 tracking-tight">Comece sua jornada criativa</h3>
                      <p className="text-brand-ink/40 max-w-sm mx-auto mb-10 text-sm leading-relaxed">
                        Transforme briefings complexos em conceitos arquitetônicos sublimes com o poder da ArchiMind AI.
                      </p>
                      <button 
                        onClick={() => setActiveView('briefing')}
                        className="text-brand-accent font-bold uppercase tracking-widest text-xs flex items-center gap-2 mx-auto hover:gap-4 transition-all"
                      >
                        Criar primeiro projeto <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {paginatedProjects.map((project) => (
                          <ProjectCard 
                            key={project.id} 
                            project={project} 
                            onClick={() => setSelectedProject(project)} 
                          />
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 pt-8">
                          <button 
                            disabled={projectPage === 1}
                            onClick={() => setProjectPage(p => Math.max(1, p - 1))}
                            className="p-3 rounded-xl bg-brand-paper border border-brand-ink/5 text-brand-ink disabled:opacity-20 hover:bg-brand-accent hover:text-white transition-all"
                          >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                          </button>
                          <span className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">
                            Página {projectPage} de {totalPages}
                          </span>
                          <button 
                            disabled={projectPage === totalPages}
                            onClick={() => setProjectPage(p => Math.min(totalPages, p + 1))}
                            className="p-3 rounded-xl bg-brand-paper border border-brand-ink/5 text-brand-ink disabled:opacity-20 hover:bg-brand-accent hover:text-white transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30">Métricas de Design</h3>
                  <div className="bg-brand-ink text-brand-paper p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 blur-3xl rounded-full -mr-16 -mt-16" />
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2 relative z-10">Total de Projetos</p>
                    <p className="text-7xl font-display font-bold mb-10 tracking-tighter relative z-10">{projects.length}</p>
                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-60">Residencial</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-accent" style={{ width: `${(projects.filter(p => p.projectType === 'Residencial').length / projects.length) * 100}%` }} />
                          </div>
                          <span className="font-mono font-bold">{projects.filter(p => p.projectType === 'Residencial').length}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs opacity-60">Comercial</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-secondary" style={{ width: `${(projects.filter(p => p.projectType === 'Comercial').length / projects.length) * 100}%` }} />
                          </div>
                          <span className="font-mono font-bold">{projects.filter(p => p.projectType === 'Comercial').length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-[32px]">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-6">Dica Vitruviana</h4>
                    <p className="text-xs italic leading-relaxed text-brand-ink/60">
                      "A arquitetura deve ser sólida, útil e bela. O equilíbrio entre esses três pilares é o que define um projeto eterno."
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'briefing' && (
            <motion.div 
              key="briefing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest">Fase de Concepção</div>
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 tracking-tighter text-brand-ink">Novo <span className="text-brand-accent">Briefing</span></h2>
                <p className="text-brand-ink/60 max-w-2xl leading-relaxed text-sm md:text-base">
                  Defina a alma do seu projeto. Nossa IA processará seus requisitos para gerar um conceito arquitetônico único e harmonicamente equilibrado.
                </p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-start">
                <form onSubmit={handleGenerateConcept} className="space-y-6 md:space-y-8 glass-card p-6 md:p-10 rounded-[32px] md:rounded-[48px]">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Nome do Cliente / Projeto</label>
                    <input 
                      type="text" 
                      required
                      value={brief.clientName}
                      onChange={e => setBrief({...brief, clientName: e.target.value})}
                      className="w-full bg-brand-paper border border-brand-ink/5 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all text-brand-ink text-sm"
                      placeholder="Ex: Apartamento Vila Nova"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Tipo</label>
                      <select 
                        value={brief.projectType}
                        onChange={e => setBrief({...brief, projectType: e.target.value})}
                        className="w-full bg-brand-paper border border-brand-ink/5 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all text-brand-ink text-sm"
                      >
                        <option className="bg-brand-paper text-brand-ink">Residencial</option>
                        <option className="bg-brand-paper text-brand-ink">Comercial</option>
                        <option className="bg-brand-paper text-brand-ink">Corporativo</option>
                        <option className="bg-brand-paper text-brand-ink">Hospitalidade</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Orçamento</label>
                      <select 
                        value={brief.budget}
                        onChange={e => setBrief({...brief, budget: e.target.value})}
                        className="w-full bg-brand-paper border border-brand-ink/5 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all text-brand-ink text-sm"
                      >
                        <option className="bg-brand-paper text-brand-ink">Econômico</option>
                        <option className="bg-brand-paper text-brand-ink">Médio</option>
                        <option className="bg-brand-paper text-brand-ink">Médio-Alto</option>
                        <option className="bg-brand-paper text-brand-ink">Luxo / Ilimitado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Topografia do Terreno</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Inclinação</label>
                        <select 
                          value={brief.terrain?.slope}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, slope: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option className="bg-brand-paper text-brand-ink">Plano</option>
                          <option className="bg-brand-paper text-brand-ink">Aclive Leve</option>
                          <option className="bg-brand-paper text-brand-ink">Aclive Acentuado</option>
                          <option className="bg-brand-paper text-brand-ink">Declive Leve</option>
                          <option className="bg-brand-paper text-brand-ink">Declive Acentuado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Orientação Solar (Fachada)</label>
                        <select 
                          value={brief.terrain?.orientation}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, orientation: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option value="Norte">Norte (Mais Sol)</option>
                          <option value="Sul">Sul (Menos Sol)</option>
                          <option value="Leste">Leste (Sol Manhã)</option>
                          <option value="Oeste">Oeste (Sol Tarde)</option>
                          <option value="Nordeste">Nordeste</option>
                          <option value="Noroeste">Noroeste</option>
                          <option value="Sudeste">Sudeste</option>
                          <option value="Sudoeste">Sudoeste</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Tipo de Solo (Prévio)</label>
                        <select 
                          value={brief.terrain?.soilType}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, soilType: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option>Visual: Firme/Seco</option>
                          <option>Visual: Úmido/Argiloso</option>
                          <option>Visual: Arenoso</option>
                          <option>Visual: Rochoso</option>
                          <option>Aguardando Sondagem</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Cota Ideal</label>
                        <input 
                          type="text"
                          value={brief.terrain?.idealElevation}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, idealElevation: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                          placeholder="Ex: +1.50m"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Perímetro & Níveis</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Comprimento (m)</label>
                        <input 
                          type="text"
                          value={brief.terrain?.perimeter?.length}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, perimeter: { ...brief.terrain!.perimeter!, length: e.target.value } }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                          placeholder="Ex: 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Largura (m)</label>
                        <input 
                          type="text"
                          value={brief.terrain?.perimeter?.width}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, perimeter: { ...brief.terrain!.perimeter!, width: e.target.value } }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                          placeholder="Ex: 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Geometria</label>
                        <select 
                          value={brief.terrain?.perimeter?.isIrregular ? 'Irregular' : 'Reto'}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, perimeter: { ...brief.terrain!.perimeter!, isIrregular: e.target.value === 'Irregular' } }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option value="Reto">Linhas Retas</option>
                          <option value="Irregular">Irregular / Curvo</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Cotas de Nível</label>
                        <input 
                          type="text"
                          value={brief.terrain?.levelQuotes}
                          onChange={e => setBrief({...brief, terrain: { ...brief.terrain!, levelQuotes: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                          placeholder="Ex: 0, 1.5, 3.0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Neuroarquitetura & Bem-estar</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Objetivo Cognitivo</label>
                        <select 
                          value={brief.neuroscience?.cognitiveGoal}
                          onChange={e => setBrief({...brief, neuroscience: { ...brief.neuroscience!, cognitiveGoal: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option className="bg-brand-paper text-brand-ink">Foco</option>
                          <option className="bg-brand-paper text-brand-ink">Criatividade</option>
                          <option className="bg-brand-paper text-brand-ink">Relaxamento</option>
                          <option className="bg-brand-paper text-brand-ink">Interação Social</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Estímulo Sensorial</label>
                        <select 
                          value={brief.neuroscience?.sensoryStimuli}
                          onChange={e => setBrief({...brief, neuroscience: { ...brief.neuroscience!, sensoryStimuli: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option className="bg-brand-paper text-brand-ink">Baixo (Calmo)</option>
                          <option className="bg-brand-paper text-brand-ink">Equilibrado</option>
                          <option className="bg-brand-paper text-brand-ink">Alto (Vibrante)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Formas</label>
                        <select 
                          value={brief.neuroscience?.formPreference}
                          onChange={e => setBrief({...brief, neuroscience: { ...brief.neuroscience!, formPreference: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option className="bg-brand-paper text-brand-ink">Orgânicas/Curvas</option>
                          <option className="bg-brand-paper text-brand-ink">Geométricas/Angulares</option>
                          <option className="bg-brand-paper text-brand-ink">Misto</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-brand-ink/30 ml-1">Biofilia</label>
                        <select 
                          value={brief.neuroscience?.biophiliaLevel}
                          onChange={e => setBrief({...brief, neuroscience: { ...brief.neuroscience!, biophiliaLevel: e.target.value }})}
                          className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink"
                        >
                          <option className="bg-brand-paper text-brand-ink">Sutil</option>
                          <option className="bg-brand-paper text-brand-ink">Integrado</option>
                          <option className="bg-brand-paper text-brand-ink">Imersivo</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Estilos de Projeto</label>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {availableStyles.map(style => (
                        <button 
                          key={style}
                          type="button"
                          onClick={() => toggleStyle(style)}
                          className={cn(
                            "px-4 md:px-5 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold transition-all border-2",
                            brief.styles.includes(style)
                              ? "bg-brand-accent border-brand-accent text-white shadow-lg shadow-brand-accent/20"
                              : "bg-transparent border-brand-ink/5 text-brand-ink/40 hover:border-brand-accent/30"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Referências Visuais</label>
                    <div className="border-2 border-dashed border-brand-ink/10 rounded-[24px] md:rounded-[32px] p-6 md:p-10 text-center hover:border-brand-accent transition-colors group cursor-pointer relative overflow-hidden">
                      {uploadProgress > 0 && (
                        <div className="absolute inset-0 bg-brand-paper/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-4">Carregando Imagens... {uploadProgress}%</p>
                          <div className="w-full max-w-xs h-1.5 bg-brand-ink/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              className="h-full bg-brand-accent rounded-full"
                            />
                          </div>
                        </div>
                      )}
                      <Upload className="w-10 h-10 text-brand-ink/10 mx-auto mb-4 group-hover:text-brand-accent transition-colors" />
                      <p className="text-xs font-bold text-brand-ink/40 uppercase tracking-widest">Arraste imagens aqui</p>
                      <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" id="file-upload-brief" />
                      <label htmlFor="file-upload-brief" className="absolute inset-0 cursor-pointer" />
                    </div>
                    {brief.uploadedImages && brief.uploadedImages.length > 0 && (
                      <div className="flex gap-3 overflow-x-auto py-2">
                        {brief.uploadedImages.map((img, i) => (
                          <div key={i} className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-brand-ink/5 relative group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => setBrief(prev => ({...prev, uploadedImages: prev.uploadedImages?.filter((_, idx) => idx !== i)}))}
                              className="absolute inset-0 bg-brand-accent/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Projeto Técnico (.DWG)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        onClick={() => document.getElementById('brief-dwg-upload')?.click()}
                        className="p-6 border-2 border-dashed border-brand-ink/10 rounded-3xl hover:border-brand-accent transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
                      >
                        <FileText className="w-8 h-8 text-brand-ink/20 group-hover:text-brand-accent transition-colors" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/40">Upload DWG</p>
                        <input 
                          id="brief-dwg-upload"
                          type="file" 
                          className="hidden" 
                          accept=".dwg" 
                          multiple 
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              const newFiles = Array.from(files).map(f => ({
                                name: f.name,
                                size: (f.size / 1024).toFixed(1) + ' KB'
                              }));
                              setBrief(prev => ({ ...prev, dwgFiles: [...(prev.dwgFiles || []), ...newFiles] }));
                            }
                          }}
                        />
                      </div>
                      {brief.dwgFiles && brief.dwgFiles.length > 0 && (
                        <div className="space-y-2">
                          {brief.dwgFiles.map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-brand-paper border border-brand-ink/5 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-brand-accent" />
                                <div>
                                  <p className="text-xs font-bold text-brand-ink truncate max-w-[150px]">{f.name}</p>
                                  <p className="text-[8px] text-brand-ink/40 uppercase tracking-widest">{f.size}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => setBrief(prev => ({ ...prev, dwgFiles: prev.dwgFiles?.filter((_, idx) => idx !== i) }))}
                                className="text-rose-500 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">O Sonho do Cliente</label>
                    <textarea 
                      rows={4}
                      value={brief.requirements}
                      onChange={e => setBrief({...brief, requirements: e.target.value})}
                      className="w-full bg-brand-paper border border-brand-ink/5 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all resize-none text-brand-ink text-sm"
                      placeholder="Descreva as sensações, necessidades e desejos para este espaço..."
                    />
                  </div>

                  {/* AI Technical Analysis Section */}
                  <div className="mt-8 glass-card p-6 md:p-8 rounded-[32px] border-l-4 border-brand-accent bg-brand-accent/5">
                    <div className="flex items-start gap-4 md:gap-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-brand-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-base md:text-lg font-display font-bold tracking-tight">Análise Técnica Automática (IA)</h4>
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Insights Ativos
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-brand-ink/5">
                            <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Viabilidade de Estilo</p>
                            <p className="text-sm font-display font-bold text-brand-accent">
                              {brief.styles.length > 0 ? `${brief.styles[0]} + ${brief.styles[1] || 'Harmônico'}` : 'Aguardando Estilos'}
                            </p>
                          </div>
                          <div className="p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-brand-ink/5">
                            <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Impacto Cognitivo</p>
                            <p className="text-sm font-display font-bold text-brand-accent">{brief.neuroscience?.cognitiveGoal || 'Equilibrado'}</p>
                          </div>
                          <div className="p-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-brand-ink/5">
                            <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Complexidade Técnica</p>
                            <p className="text-sm font-display font-bold text-brand-accent">
                              {brief.terrain?.slope === 'Plano' ? 'Baixa' : 'Média-Alta'}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] md:text-xs text-brand-ink/60 leading-relaxed">
                          {brief.clientName ? `Para o projeto de ${brief.clientName}, ` : 'Com base nos dados inseridos, '} 
                          a ArchiMind AI identifica uma forte inclinação para o estilo {brief.styles[0] || 'contemporâneo'}. 
                          A topografia {brief.terrain?.slope.toLowerCase()} sugere uma fundação do tipo {brief.terrain?.slope === 'Plano' ? 'sapata isolada' : 'estacas com viga baldrame'}. 
                          O objetivo de {brief.neuroscience?.cognitiveGoal.toLowerCase()} será potencializado através de {brief.neuroscience?.sensoryStimuli === 'Alto (Vibrante)' ? 'contrastes cromáticos' : 'iluminação zenital difusa'}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-ink text-brand-paper py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-brand-accent disabled:opacity-50 transition-all duration-500 shadow-xl shadow-brand-ink/10 btn-vibrant"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sintetizando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Gerar Conceito ArchiMind
                      </>
                    )}
                  </motion.button>

                  <button 
                    type="button"
                    onClick={() => generateStructuredBrief(brief)}
                    className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-brand-ink/5 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar Briefing Estruturado (PDF)
                  </button>
                </form>

                <div className="relative">
                  <AnimatePresence mode="wait">
                    {currentConcept ? (
                      <motion.div 
                        key="concept-result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                      >
                        <div className="glass-card p-10 rounded-[48px] border-l-8 border-brand-accent">
                          <h3 className="text-4xl font-display font-bold tracking-tight mb-6">{currentConcept.title}</h3>
                        
                          {visualUrl && (
                            <div className="mb-8 rounded-3xl overflow-hidden aspect-video bg-brand-paper shadow-2xl">
                              <img src={visualUrl} alt="Conceito Visual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}

                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent">A Essência do Projeto</h4>
                              <button 
                                onClick={() => setShowGoldenRatio(!showGoldenRatio)}
                                className="text-[10px] text-brand-ink/40 hover:text-brand-accent flex items-center gap-2 transition-colors font-bold uppercase tracking-widest"
                              >
                                <Maximize className="w-3 h-3" />
                                {showGoldenRatio ? 'Ocultar Geometria' : 'Ver Geometria'}
                              </button>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <p className="text-brand-ink/70 leading-relaxed text-base">{currentConcept.description}</p>
                            </div>
                          
                            {/* 3D Concept Viewer */}
                            <div className="mt-12">
                              <ConceptViewer 
                                materials={currentConcept.materials} 
                                lightingStrategy={currentConcept.lightingStrategy}
                                palette={currentConcept.colorPalette}
                              />
                            </div>

                          <AnimatePresence>
                            {showGoldenRatio && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-brand-ink text-brand-paper p-6 rounded-2xl border border-white/10 relative">
                                  <div className="absolute top-4 right-4 text-[8px] font-mono opacity-40">Φ = 1.618</div>
                                  <h5 className="text-xs font-serif mb-3">Aplicação da Geometria Sagrada</h5>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <div className="aspect-video border border-white/20 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 border-r border-white/20 w-[61.8%]" />
                                        <div className="absolute top-0 left-0 w-[61.8%] h-[61.8%] border-b border-white/20" />
                                        <div className="text-[8px] opacity-40">Grid de Fibonacci</div>
                                      </div>
                                      <p className="text-[9px] opacity-60">Use para posicionar o mobiliário principal no ponto focal (61.8% do espaço).</p>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="aspect-video border border-white/20 rounded-lg flex items-center justify-center">
                                        <div className="w-1/2 h-1/2 border border-brand-accent/40 rounded-full" />
                                        <div className="absolute text-[8px] opacity-40">Círculos Harmônicos</div>
                                      </div>
                                      <p className="text-[9px] opacity-60">Mantenha a proporção entre o pé-direito e a largura das aberturas.</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            </AnimatePresence>
                          </div>
                          
                          <div className="pt-6 border-t border-brand-ink/5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent">Paleta de Cores & Mood</h4>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setPaletteGrouping(paletteGrouping === 'hue' ? 'none' : 'hue')}
                                className={cn(
                                  "text-[8px] px-2 py-1 rounded-md border transition-colors",
                                  paletteGrouping === 'hue' ? "bg-brand-accent text-white border-brand-accent" : "bg-brand-paper text-brand-ink/40 border-brand-ink/10"
                                )}
                              >
                                Agrupar por Tom
                              </button>
                            </div>
                          </div>

                          {/* Mood Selector */}
                          <div className="mb-6">
                            <p className="text-[9px] text-brand-ink/40 uppercase tracking-widest font-bold mb-2">Qual sensação deseja transmitir?</p>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'calm', label: 'Calma', icon: <Sun className="w-3 h-3" />, colors: ['#E0F2F1', '#B2DFDB', '#80CBC4'] },
                                { id: 'energy', label: 'Energia', icon: <Zap className="w-3 h-3" />, colors: ['#FFF3E0', '#FFE0B2', '#FFB74D'] },
                                { id: 'luxury', label: 'Luxo', icon: <Award className="w-3 h-3" />, colors: ['#1A1A1A', '#8C7851', '#DAC69F'] },
                                { id: 'nature', label: 'Natureza', icon: <ImageIcon className="w-3 h-3" />, colors: ['#E8F5E9', '#C8E6C9', '#81C784'] }
                              ].map(mood => (
                                <button
                                  key={mood.id}
                                  onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all",
                                    selectedMood === mood.id 
                                      ? "bg-brand-ink text-brand-paper shadow-lg" 
                                      : "bg-brand-paper/50 text-brand-ink/60 hover:bg-brand-paper"
                                  )}
                                >
                                  {mood.icon}
                                  {mood.label}
                                </button>
                              ))}
                            </div>
                            <AnimatePresence>
                              {selectedMood && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="mt-3 p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/10"
                                >
                                  <p className="text-[9px] text-brand-accent font-bold uppercase mb-2">Sugestão de Cores Complementares:</p>
                                  <div className="flex gap-2">
                                    {['#calm', '#energy', '#luxury', '#nature'].find(m => m === `#${selectedMood}`) && (
                                      <>
                                        <div className="w-6 h-6 rounded-md bg-brand-accent/20" />
                                        <div className="w-6 h-6 rounded-md bg-brand-accent/40" />
                                        <div className="w-6 h-6 rounded-md bg-brand-accent/60" />
                                      </>
                                    )}
                                    <p className="text-[9px] italic text-brand-ink/60">Combine estas tonalidades para reforçar o sentimento de {['Calma', 'Energia', 'Luxo', 'Natureza'][['calm', 'energy', 'luxury', 'nature'].indexOf(selectedMood!)]}.</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <Reorder.Group 
                            axis="y" 
                            values={currentConcept.colorPalette} 
                            onReorder={(newPalette) => setCurrentConcept({ ...currentConcept, colorPalette: newPalette })}
                            className="grid grid-cols-1 gap-3"
                          >
                            {currentConcept.colorPalette.map((c) => (
                              <Reorder.Item 
                                key={c.hex} 
                                value={c}
                                className="flex items-center gap-4 bg-brand-paper/30 p-3 rounded-xl group cursor-grab active:cursor-grabbing"
                              >
                                <div className="relative">
                                  <input 
                                    type="color"
                                    value={c.hex}
                                    onChange={(e) => {
                                      const newPalette = currentConcept.colorPalette.map(p => 
                                        p.hex === c.hex ? { ...p, hex: e.target.value } : p
                                      );
                                      setCurrentConcept({ ...currentConcept, colorPalette: newPalette });
                                    }}
                                    className="w-12 h-12 rounded-lg border border-brand-ink/10 cursor-pointer overflow-hidden p-0 bg-transparent"
                                  />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs font-bold uppercase tracking-wider">{c.name}</p>
                                    <div className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter",
                                      getContrastRatio(c.hex) === 'dark' ? "bg-brand-ink text-brand-paper" : "bg-brand-paper text-brand-ink border border-brand-ink/10"
                                    )}>
                                      Contraste: {getContrastRatio(c.hex) === 'dark' ? 'Alto' : 'Baixo'}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-brand-ink/40 font-mono mb-1">{c.hex}</p>
                                  <p className="text-[9px] text-brand-ink/60 italic leading-tight">{c.psychology}</p>
                                  {getContrastRatio(c.hex) === 'light' && (
                                    <p className="text-[8px] text-brand-accent mt-1 flex items-center gap-1">
                                      <Info className="w-2 h-2" /> Sugestão: Use com fundos escuros para melhor legibilidade.
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button 
                                    onClick={() => copyToClipboard(c.hex)}
                                    className="p-2 hover:bg-brand-accent hover:text-white rounded-lg transition-colors"
                                  >
                                    {copiedColor === c.hex ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-brand-ink/20" />}
                                  </button>
                                  <Menu className="w-4 h-4 text-brand-ink/10 group-hover:text-brand-ink/30 transition-colors mx-auto" />
                                </div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        </div>

                          {currentConcept.pricingInfo && (
                            <div className="bg-brand-ink text-brand-paper p-6 rounded-2xl shadow-xl">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-3 flex items-center gap-2">
                                <DollarSign className="w-3 h-3" />
                                Estimativa de Mercado ({brief.location.city})
                              </h4>
                              <p className="text-2xl font-serif mb-2">{currentConcept.pricingInfo.averageM2Price}</p>
                              <p className="text-[10px] leading-relaxed opacity-70 mb-4">{currentConcept.pricingInfo.marketAnalysis}</p>
                              <div className="p-3 bg-brand-ink/5 rounded-xl border border-brand-ink/10">
                                <p className="text-[10px] font-bold uppercase mb-1">Sugestão de Cobrança:</p>
                                <p className="text-[10px] italic">{currentConcept.pricingInfo.suggestion}</p>
                              </div>
                            </div>
                          )}

                          {currentConcept.regulations && (
                            <div className="bg-brand-accent/5 p-6 rounded-2xl border border-brand-accent/10">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-3 flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                Normas & Zoneamento ({brief.location.city})
                              </h4>
                              <p className="text-xs leading-relaxed text-brand-ink/70 mb-4">{currentConcept.regulations.summary}</p>
                              <div className="flex flex-wrap gap-2">
                                {currentConcept.regulations.sources.map((source, i) => (
                                  <span key={i} className="text-[8px] bg-brand-paper px-2 py-1 rounded-md border border-brand-ink/5 text-brand-ink/40">
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {currentConcept.topographyAnalysis && (
                            <div className="bg-brand-secondary/5 p-6 rounded-2xl border border-brand-secondary/10">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-secondary mb-3 flex items-center gap-2">
                                <Maximize2 className="w-3 h-3" />
                                Análise de Topografia & Cota Ideal
                              </h4>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-secondary/60 mb-1">Cota Ideal:</p>
                                  <p className="text-xs font-medium text-brand-ink/80">{currentConcept.topographyAnalysis.idealElevation}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-secondary/60 mb-1">Estratégia de Inclinação:</p>
                                  <p className="text-xs text-brand-ink/70 leading-relaxed">{currentConcept.topographyAnalysis.slopeStrategy}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-secondary/60 mb-1">Orientação Solar & Ventilação:</p>
                                  <p className="text-xs text-brand-ink/70 leading-relaxed">{currentConcept.topographyAnalysis.orientationAdvice}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent">Estratégia de Iluminação</h4>
                              <button 
                                onClick={() => setShowLightingTips(!showLightingTips)}
                                className="text-[10px] text-brand-ink/40 hover:text-brand-accent flex items-center gap-1 transition-colors"
                              >
                                {showLightingTips ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showLightingTips ? 'Ocultar Dicas' : 'Dicas de Psicologia'}
                              </button>
                            </div>
                            <p className="text-xs text-brand-ink/70 italic mb-4">{currentConcept.lightingStrategy}</p>
                            
                            <AnimatePresence>
                              {showLightingTips && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="bg-brand-paper/50 p-4 rounded-2xl border border-brand-ink/5 space-y-3">
                                    <div className="flex items-start gap-3">
                                      <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-[10px] font-bold uppercase">Luz Quente (2700K-3000K)</p>
                                        <p className="text-[9px] text-brand-ink/60">Promove relaxamento e aconchego. Ideal para salas e quartos.</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <Zap className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-[10px] font-bold uppercase">Luz Fria (5000K+)</p>
                                        <p className="text-[9px] text-brand-ink/60">Aumenta o foco e a produtividade. Use em cozinhas e escritórios.</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <Zap className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-[10px] font-bold uppercase">Luz Indireta</p>
                                        <p className="text-[9px] text-brand-ink/60">Reduz sombras duras e cria uma atmosfera etérea e luxuosa.</p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {currentConcept.neuroscienceAnalysis && (
                            <div className="bg-brand-accent/5 p-6 rounded-2xl border border-brand-accent/10">
                              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-3 flex items-center gap-2">
                                <Zap className="w-3 h-3" />
                                Análise de Neuroarquitetura
                              </h4>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-accent/60 mb-1">Impacto Cognitivo:</p>
                                  <p className="text-xs text-brand-ink/70 leading-relaxed">{currentConcept.neuroscienceAnalysis.cognitiveImpact}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-accent/60 mb-1">Estratégia Sensorial:</p>
                                  <p className="text-xs text-brand-ink/70 leading-relaxed">{currentConcept.neuroscienceAnalysis.sensoryStrategy}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-accent/60 mb-1">Biofilia & Bem-estar:</p>
                                  <p className="text-xs text-brand-ink/70 leading-relaxed">{currentConcept.neuroscienceAnalysis.biophilicAdvice}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t border-brand-ink/5">
                            <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-3 flex items-center gap-2">
                              <Sparkles className="w-3 h-3" />
                              Caminhos Criativos & Sugestões
                            </h4>
                            <p className="text-[10px] text-brand-ink/40 mb-4 italic">
                              Ideias pensadas para harmonizar as referências com o sonho do seu cliente:
                            </p>
                            <div className="space-y-3">
                              {currentConcept.suggestions.map((s, i) => (
                                <div key={i} className="bg-brand-paper/50 p-4 rounded-2xl border border-brand-ink/5 relative overflow-hidden group">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent/20 group-hover:bg-brand-accent transition-colors" />
                                  <p className="text-xs leading-relaxed text-brand-ink/80 italic">&quot;{s}&quot;</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-6 flex items-center gap-2 text-[10px] text-brand-accent font-bold uppercase tracking-widest opacity-60">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                            Conceito Humanizado & Harmonioso
                          </div>

                          <div className="flex gap-4 mt-8">
                            <button 
                              onClick={() => setPresentationMode(true)}
                              className="flex-1 bg-brand-paper border border-brand-ink/10 text-brand-ink py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-accent hover:text-white transition-all duration-300 shadow-xl shadow-brand-ink/5"
                            >
                              <Maximize2 className="w-5 h-5" />
                              Apresentação
                            </button>
                            <button 
                              onClick={handleSaveProject}
                              className="flex-1 bg-brand-ink text-brand-paper py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-accent transition-all duration-300 shadow-xl shadow-brand-ink/20"
                            >
                              <Save className="w-5 h-5" />
                              Salvar Projeto
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="h-full min-h-[400px] border-2 border-dashed border-brand-ink/10 rounded-3xl flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-12 h-12 bg-brand-accent/10 rounded-full flex items-center justify-center mb-4">
                          <Sparkles className="w-6 h-6 text-brand-accent" />
                        </div>
                        <p className="text-brand-ink/40 text-sm">Preencha o briefing ao lado para visualizar o conceito gerado pela IA.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'design-guide' && (
            <motion.div 
              key="design-guide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 lg:p-12 max-w-6xl mx-auto min-h-full"
            >
              <header className="mb-12">
                <h2 className="text-4xl lg:text-6xl font-serif font-light mb-4">Guia de Design & Harmonia</h2>
                <p className="text-brand-ink/60 dark:text-dark-ink/60 max-w-2xl">
                  Explore os fundamentos que transformam espaços em experiências: Psicologia das Cores, Teoria Cromática e a Geometria Sagrada da Proporção Áurea.
                </p>
              </header>

              <div className="space-y-20">
                {/* Section 1: Color Psychology */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <Palette className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-serif">Psicologia das Cores</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { color: '#FFFFFF', name: 'Branco', meaning: 'Amplitude, pureza, clareza. Use para destacar a luz natural e criar espaços de respiro.' },
                      { color: '#1A1A1A', name: 'Preto', meaning: 'Elegância, profundidade, autoridade. Ideal para detalhes que exigem sofisticação.' },
                      { color: '#3B82F6', name: 'Azul', meaning: 'Serenidade, foco, confiança. Perfeito para áreas de trabalho e descanso.' },
                      { color: '#10B981', name: 'Verde', meaning: 'Renovação, equilíbrio, biofilia. Conecta o interior com a natureza.' },
                      { color: '#EF4444', name: 'Vermelho', meaning: 'Energia, calor, estimulação. Use em áreas sociais para promover interação.' },
                      { color: '#F59E0B', name: 'Amarelo', meaning: 'Luz, otimismo, criatividade. Ilumina espaços escuros e estimula a mente.' },
                      { color: '#8B5CF6', name: 'Roxo', meaning: 'Luxo, introspecção, mistério. Traz um ar de exclusividade e espiritualidade.' },
                      { color: '#8C7851', name: 'Terra/Ouro', meaning: 'Acolhimento, valor, estabilidade. Remete ao natural e ao clássico.' }
                    ].map((item, i) => (
                      <div key={i} className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5 shadow-sm">
                        <div className="w-full h-24 rounded-2xl mb-4 shadow-inner" style={{ backgroundColor: item.color }} />
                        <h4 className="font-serif text-xl mb-2">{item.name}</h4>
                        <p className="text-[10px] text-brand-ink/60 dark:text-dark-ink/60 leading-relaxed">{item.meaning}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 2: Color Theory & Harmony */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-serif">Teoria & Harmonia</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { 
                        title: 'Monocromático', 
                        desc: 'Variações de uma única cor. Cria um visual coeso, calmo e extremamente sofisticado.',
                        colors: ['#8C7851', '#A6926B', '#C0AC85', '#DAC69F']
                      },
                      { 
                        title: 'Análogo', 
                        desc: 'Cores vizinhas no círculo cromático. Oferece uma harmonia natural e serena ao ambiente.',
                        colors: ['#10B981', '#059669', '#047857', '#065F46']
                      },
                      { 
                        title: 'Complementar', 
                        desc: 'Cores opostas. Cria contraste vibrante e dinâmico, ideal para pontos de destaque.',
                        colors: ['#3B82F6', '#EF4444', '#FFFFFF', '#1A1A1A']
                      }
                    ].map((item, i) => (
                      <div key={i} className="bg-brand-paper p-8 rounded-[40px] border border-brand-ink/5">
                        <h4 className="font-serif text-2xl mb-4">{item.title}</h4>
                        <p className="text-xs text-brand-ink/60 dark:text-dark-ink/60 mb-6 leading-relaxed">{item.desc}</p>
                        <div className="flex gap-2">
                          {item.colors.map((c, idx) => (
                            <div key={idx} className="flex-1 h-12 rounded-xl" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section 3: Golden Ratio & Geometry */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <Maximize className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-serif">Proporção Áurea & Geometria</h3>
                  </div>
                  <div className="bg-brand-ink text-brand-paper p-8 lg:p-12 rounded-[50px] golden-ratio-grid gap-12 items-center">
                    <div className="space-y-6">
                      <h4 className="text-4xl font-serif font-light">O Número de Ouro (Φ)</h4>
                      <p className="text-sm opacity-70 leading-relaxed">
                        A proporção 1,618 é encontrada na natureza, na arte e na arquitetura clássica. Utilizá-la garante que o olhar humano perceba o espaço como intrinsecamente "correto" e belo.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/10 rounded-2xl">
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Regra 60-30-10</p>
                          <p className="text-[10px] opacity-60 italic">Distribuição harmônica de cores e volumes no espaço.</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl">
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Espiral de Fibonacci</p>
                          <p className="text-[10px] opacity-60 italic">Guia para o fluxo de circulação e posicionamento de mobiliário.</p>
                        </div>
                      </div>
                    </div>
                    <div className="relative aspect-square border border-white/20 rounded-2xl overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                      <div className="w-3/4 h-3/4 border border-brand-accent/40 rounded-full flex items-center justify-center">
                        <div className="w-3/4 h-3/4 border border-brand-accent/60 rounded-full flex items-center justify-center">
                          <div className="w-3/4 h-3/4 border border-brand-accent/80 rounded-full" />
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-brand-accent">1.618...</p>
                    </div>
                  </div>
                </section>

                {/* Design System Council Journey */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                      <Layout className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-serif">Design System Council Journey</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: 'Brad Frost', role: 'Atomic Design', icon: <Layers className="w-4 h-4" />, desc: 'Metodologia de átomos, moléculas e organismos.' },
                      { name: 'Dan Mall', role: 'Design Ops', icon: <Settings className="w-4 h-4" />, desc: 'Sistemas de design escaláveis e sustentáveis.' },
                      { name: 'Dave Malouf', role: 'Design Strategy', icon: <Target className="w-4 h-4" />, desc: 'Alinhamento de valor e impacto do design.' },
                      { name: 'Design Chief', role: 'Creative Direction', icon: <Sparkles className="w-4 h-4" />, desc: 'Supervisão de consistência e visão estética.' },
                      { name: 'UX Design Expert', role: 'User Experience', icon: <Users className="w-4 h-4" />, desc: 'Foco na jornada e usabilidade do espaço.' },
                      { name: 'Nano Banana Generator', role: 'AI Generation', icon: <ZapIcon className="w-4 h-4" />, desc: 'Automação de componentes e variações.' },
                      { name: 'Jessica (UX/UI)', role: 'Interface Design', icon: <Palette className="w-4 h-4" />, desc: 'Refinamento visual e interativo.' }
                    ].map((expert, i) => (
                      <motion.div 
                        key={i}
                        whileHover={{ y: -5 }}
                        className="bg-brand-paper border border-brand-ink/5 p-6 rounded-[32px] hover:shadow-xl transition-all group"
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-2xl bg-brand-ink/5 flex items-center justify-center text-brand-ink group-hover:bg-brand-accent group-hover:text-white transition-colors">
                            {expert.icon}
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-brand-ink">{expert.name}</p>
                            <p className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">{expert.role}</p>
                          </div>
                        </div>
                        <p className="text-xs text-brand-ink/40 leading-relaxed">
                          {expert.desc}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeView === 'mind-map' && (
            <motion.div 
              key="mind-map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 md:p-8 lg:p-10 h-full flex flex-col min-h-full"
            >
              <header className="mb-6 md:mb-8">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-2 dark:text-dark-ink">Mapa Mental Criativo</h2>
                <p className="text-brand-ink/60 dark:text-dark-ink/60 text-sm md:text-base">Organize suas referências, fluxos e ideias visualmente.</p>
              </header>

              <div className="flex-1 bg-brand-paper rounded-[40px] border border-brand-ink/5 relative overflow-hidden shadow-inner p-8">
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
                
                <div className="relative h-full flex items-center justify-center">
                  {/* Central Node */}
                  <motion.div 
                    drag
                    dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
                    className="w-48 h-48 rounded-full bg-brand-ink text-brand-paper flex items-center justify-center text-center p-6 shadow-2xl z-10 cursor-grab active:cursor-grabbing"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-widest opacity-60 mb-2">Projeto Atual</p>
                      <p className="font-serif text-lg leading-tight">{projects[0]?.clientName || 'Novo Projeto'}</p>
                    </div>
                  </motion.div>

                  {/* Branch Nodes */}
                  {[
                    { label: 'Cores', icon: <Palette className="w-4 h-4" />, x: -250, y: -150, color: 'bg-brand-accent' },
                    { label: 'Materiais', icon: <Layers className="w-4 h-4" />, x: 250, y: -120, color: 'bg-emerald-500' },
                    { label: 'Iluminação', icon: <Zap className="w-4 h-4" />, x: -200, y: 180, color: 'bg-yellow-500' },
                    { label: 'Mobiliário', icon: <Briefcase className="w-4 h-4" />, x: 220, y: 150, color: 'bg-blue-500' },
                    { label: 'Referências', icon: <ImageIcon className="w-4 h-4" />, x: 0, y: -250, color: 'bg-purple-500' }
                  ].map((node, i) => (
                    <motion.div
                      key={i}
                      drag
                      initial={{ x: node.x, y: node.y }}
                      className={cn(
                        "absolute w-32 h-32 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-xl cursor-grab active:cursor-grabbing text-white",
                        node.color
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        {node.icon}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-widest">{node.label}</p>
                      <button className="absolute -top-2 -right-2 w-6 h-6 bg-brand-paper text-brand-ink rounded-full flex items-center justify-center shadow-lg">
                        <Plus className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}

                  {/* SVG Lines (Simplified) */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                    <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    <line x1="50%" y1="50%" x2="70%" y2="35%" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    <line x1="50%" y1="50%" x2="35%" y2="70%" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    <line x1="50%" y1="50%" x2="65%" y2="65%" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                    <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="currentColor" strokeWidth="2" strokeDasharray="4" />
                  </svg>
                </div>

                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-brand-ink text-brand-paper rounded-full text-[10px] font-bold uppercase tracking-widest">Adicionar Nó</button>
                    <button className="px-4 py-2 bg-brand-paper border border-brand-ink/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-ink">Limpar Mapa</button>
                  </div>
                  <p className="text-[10px] text-brand-ink/40 italic">Arraste os nós para organizar suas ideias livremente.</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'concept-lab' && (
            <motion.div 
              key="concept-lab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full"
            >
              <ConceptLab 
                onSaveToGallery={handleSaveToGallery} 
                projectContext={projects[0] ? `Projeto: ${projects[0].clientName}, Tipo: ${projects[0].projectType}, Estilos: ${projects[0].styles.join(', ')}` : undefined}
                dwgFiles={brief.dwgFiles}
                onDwgUpload={(files) => setBrief(prev => ({ ...prev, dwgFiles: [...(prev.dwgFiles || []), ...files] }))}
                onDwgDelete={(index) => setBrief(prev => ({ ...prev, dwgFiles: prev.dwgFiles?.filter((_, i) => i !== index) }))}
              />
            </motion.div>
          )}

          {activeView === 'gallery' && (
            <motion.div 
              key="gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-8 md:mb-12">
                <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tighter dark:text-dark-ink">Galeria de <span className="text-brand-accent">Conceitos</span></h2>
                <p className="text-brand-ink/40 dark:text-dark-ink/40 uppercase tracking-widest font-bold mt-1 text-[8px] md:text-[10px]">Sua coleção de inspirações geradas pela IA</p>
              </header>

              {gallery.length === 0 ? (
                <div className="glass-card p-12 md:p-20 rounded-[32px] md:rounded-[48px] text-center border-dashed border-2">
                  <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-brand-ink/10 mx-auto mb-6" />
                  <p className="text-brand-ink/40 font-bold uppercase tracking-widest text-[10px] md:text-xs">Sua galeria está vazia</p>
                  <button 
                    onClick={() => setActiveView('concept-lab')}
                    className="mt-6 text-brand-accent font-bold uppercase tracking-widest text-[9px] md:text-[10px] hover:underline"
                  >
                    Ir para o Concept Lab
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {gallery.map((img, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-3 rounded-[32px] group relative overflow-hidden"
                    >
                      <div className="aspect-video rounded-2xl overflow-hidden relative">
                        <img src={img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={`Gallery ${i}`} referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button 
                            onClick={() => toggleFavorite(img)}
                            className={cn(
                              "p-3 rounded-xl transition-all",
                              favorites.includes(img) ? "bg-brand-accent text-white" : "bg-brand-paper text-brand-ink hover:bg-brand-accent hover:text-white"
                            )}
                          >
                            <Star className={cn("w-4 h-4", favorites.includes(img) && "fill-current")} />
                          </button>
                          <button className="p-3 bg-brand-paper text-brand-ink rounded-xl hover:bg-brand-accent hover:text-white transition-all">
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setGallery(prev => prev.filter((_, idx) => idx !== i))}
                            className="p-3 bg-brand-paper text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'moodboard' && (
            <motion.div 
              key="moodboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <Moodboard />
            </motion.div>
          )}

          {activeView === 'budget' && (
            <motion.div 
              key="budget"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest">Financeiro</div>
                    <div className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary rounded-full text-[10px] font-bold uppercase tracking-widest">Vitruvius Approved</div>
                  </div>
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold mb-4 tracking-tighter text-brand-ink">Orçamentos <span className="text-brand-accent">Detalhados</span></h2>
                  <p className="text-brand-ink/60 max-w-xl text-sm md:text-base">Controle total sobre materiais, etapas de obra e despesas administrativas com cálculos automáticos de impacto financeiro.</p>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addBudgetItem}
                    className="px-6 py-4 bg-brand-accent text-white rounded-2xl shadow-lg shadow-brand-accent/20 flex items-center gap-3 text-xs font-bold uppercase tracking-widest btn-vibrant"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar Item
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => projects[0] && generatePDFReport(projects[0])}
                    className="px-6 py-4 bg-brand-paper border border-brand-ink/10 rounded-2xl shadow-sm flex items-center gap-3 text-xs font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-white transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    Relatório PDF
                  </motion.button>
                </div>
              </header>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <div className="glass-card p-8 rounded-[32px] h-[400px] flex flex-col">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30 mb-8 shrink-0">Custos por Categoria</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(budgetItems.reduce((acc, item) => {
                            acc[item.category] = (acc[item.category] || 0) + item.cost;
                            return acc;
                          }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {budgetItems.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#F27D26', '#5A5A40', '#8E9299', '#0a0a0a', '#4a4a4a'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-[32px] h-[400px] flex flex-col">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brand-ink/30 dark:text-dark-ink/30 mb-8 shrink-0">Custos por Etapa</h3>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(budgetItems.reduce((acc, item) => {
                          const stage = item.stage || 'Outros';
                          acc[stage] = (acc[stage] || 0) + item.cost;
                          return acc;
                        }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" fill="#F27D26" radius={[8, 8, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
                <div className="xl:col-span-3 space-y-8">
                  {/* Add Item Form */}
                  <div className="glass-card p-8 rounded-[40px] border-b-4 border-brand-accent">
                    <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-brand-ink">
                      <Plus className="w-5 h-5 text-brand-accent" />
                      Novo Item de Orçamento
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Categoria</label>
                        <input type="text" id="new-cat" className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink" placeholder="Ex: Revestimento" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Etapa</label>
                        <input type="text" id="new-stage" className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink" placeholder="Ex: Acabamento" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Tipo</label>
                        <select id="new-type" className="w-full bg-brand-paper border border-brand-ink/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20 text-brand-ink">
                          <option className="bg-brand-paper text-brand-ink" value="material">Material</option>
                          <option className="bg-brand-paper text-brand-ink" value="labor">Mão de Obra</option>
                          <option className="bg-brand-paper text-brand-ink" value="other">Outros</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 dark:text-dark-ink/40 ml-1">Sugestão Prof. (R$)</label>
                        <input type="number" id="new-prof" className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20" placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Custo Final (R$)</label>
                        <input type="number" id="new-cost" className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent/20" placeholder="0.00" />
                      </div>
                      <div className="sm:col-span-2 md:col-span-5 flex items-end">
                        <button 
                          onClick={() => {
                            const cat = (document.getElementById('new-cat') as HTMLInputElement).value;
                            const stage = (document.getElementById('new-stage') as HTMLInputElement).value;
                            const type = (document.getElementById('new-type') as HTMLSelectElement).value as any;
                            const prof = parseFloat((document.getElementById('new-prof') as HTMLInputElement).value) || 0;
                            const cost = parseFloat((document.getElementById('new-cost') as HTMLInputElement).value) || 0;
                            if (cat && (cost > 0 || prof > 0)) {
                              setBudgetItems([...budgetItems, { 
                                id: Date.now().toString(), 
                                category: cat, 
                                description: 'Novo item', 
                                cost, 
                                professionalPrice: prof,
                                type, 
                                stage 
                              }]);
                              (document.getElementById('new-cat') as HTMLInputElement).value = '';
                              (document.getElementById('new-cost') as HTMLInputElement).value = '';
                              (document.getElementById('new-prof') as HTMLInputElement).value = '';
                              (document.getElementById('new-stage') as HTMLInputElement).value = '';
                            }
                          }}
                          className="w-full bg-brand-ink text-brand-paper py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-brand-accent transition-all"
                        >
                          Adicionar Item ao Orçamento
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-[32px] md:rounded-[40px] overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-ink/5 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">
                            <th className="px-8 py-6">Categoria</th>
                            <th className="px-8 py-6">Etapa</th>
                            <th className="px-8 py-6">Descrição</th>
                            <th className="px-8 py-6">Sugestão Prof. (R$)</th>
                            <th className="px-8 py-6">Estimativa IA (R$)</th>
                            <th className="px-8 py-6">Custo Final (R$)</th>
                            <th className="px-8 py-6"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-ink/5">
                          {budgetItems.map(item => (
                            <tr key={item.id} className="group hover:bg-brand-accent/5 transition-colors">
                              <td className="px-8 py-5">
                                <input 
                                  type="text" 
                                  value={item.category} 
                                  onChange={(e) => updateBudgetItem(item.id, 'category', e.target.value)}
                                  className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full"
                                />
                              </td>
                              <td className="px-8 py-5">
                                <input 
                                  type="text" 
                                  value={item.stage || ''} 
                                  onChange={(e) => updateBudgetItem(item.id, 'stage', e.target.value)}
                                  className="bg-transparent border-none focus:ring-0 text-[10px] uppercase tracking-widest font-bold text-brand-accent/60 w-full"
                                  placeholder="Etapa"
                                />
                              </td>
                              <td className="px-8 py-5">
                                <input 
                                  type="text" 
                                  value={item.description} 
                                  onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                                  className="bg-transparent border-none focus:ring-0 text-xs w-full text-brand-ink/60"
                                />
                              </td>
                              <td className="px-8 py-5">
                                <input 
                                  type="number" 
                                  value={item.professionalPrice || 0} 
                                  onChange={(e) => updateBudgetItem(item.id, 'professionalPrice', parseFloat(e.target.value) || 0)}
                                  className="bg-transparent border-none focus:ring-0 text-xs font-bold w-full text-brand-secondary"
                                />
                              </td>
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-brand-accent">
                                    {item.marketEstimate ? `R$ ${item.marketEstimate.toLocaleString()}` : '---'}
                                  </span>
                                  <button 
                                    onClick={() => fetchAIEstimate(item.id)}
                                    className="p-1.5 hover:bg-brand-accent/10 rounded-lg text-brand-accent transition-colors"
                                    title="Buscar Estimativa de Mercado"
                                  >
                                    <Search className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-8 py-5">
                                <input 
                                  type="number" 
                                  value={item.cost} 
                                  onChange={(e) => updateBudgetItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                  className="bg-transparent border-none focus:ring-0 text-sm font-mono font-bold w-full"
                                />
                              </td>
                              <td className="px-8 py-5 text-right">
                                <button 
                                  onClick={() => removeBudgetItem(item.id)}
                                  className="p-2 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-brand-ink/5">
                      {budgetItems.map(item => (
                        <div key={item.id} className="p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-brand-accent">{item.stage || 'Sem Etapa'}</p>
                              <h4 className="text-sm font-bold text-brand-ink">{item.category}</h4>
                            </div>
                            <button 
                              onClick={() => removeBudgetItem(item.id)}
                              className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-brand-ink/60">{item.description}</p>
                          <div className="grid grid-cols-2 gap-4 pt-2">
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40">Sugestão Prof.</p>
                              <p className="text-xs font-bold text-brand-secondary">R$ {item.professionalPrice?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40">Custo Final</p>
                              <p className="text-xs font-bold text-brand-ink">R$ {item.cost.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="bg-brand-accent/5 p-3 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-brand-accent" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Estimativa IA</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-brand-accent">
                                {item.marketEstimate ? `R$ ${item.marketEstimate.toLocaleString()}` : '---'}
                              </span>
                              <button 
                                onClick={() => fetchAIEstimate(item.id)}
                                className="p-1 text-brand-accent"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-brand-ink text-brand-paper p-10 rounded-[48px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/20 blur-3xl rounded-full -mr-16 -mt-16" />
                    <h3 className="text-3xl font-display font-bold mb-8 relative z-10">Resumo <br/><span className="text-brand-accent">Financeiro</span></h3>
                    <div className="space-y-6 relative z-10">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-accent" /> Materiais
                        </span>
                        <span className="font-mono font-bold">
                          R$ {budgetItems.filter(i => i.type === 'material').reduce((acc, i) => acc + i.cost, 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-secondary" /> Mão de Obra
                        </span>
                        <span className="font-mono font-bold">
                          R$ {budgetItems.filter(i => i.type === 'labor').reduce((acc, i) => acc + i.cost, 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-gold" /> Outras Despesas
                        </span>
                        <span className="font-mono font-bold">
                          R$ {budgetItems.filter(i => i.type === 'other').reduce((acc, i) => acc + i.cost, 0).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="pt-8 border-t border-white/10">
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">Total do Investimento</p>
                        <p className="text-5xl font-display font-bold text-brand-accent tracking-tighter">R$ {budgetTotal.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-[40px]">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-6">Custos por Etapa</h4>
                    <div className="space-y-4">
                      {Array.from(new Set(budgetItems.map(i => i.stage || 'Não Definida'))).map(stage => {
                        const stageTotal = budgetItems.filter(i => (i.stage || 'Não Definida') === stage).reduce((acc, i) => acc + i.cost, 0);
                        const percentage = budgetTotal > 0 ? (stageTotal / budgetTotal) * 100 : 0;
                        return (
                          <div key={stage} className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                              <span className="text-brand-ink/60">{stage}</span>
                              <span className="text-brand-accent">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-brand-paper dark:bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className="h-full bg-brand-accent"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'regulations' && (
            <motion.div 
              key="regulations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest">Legislação Urbana</div>
                </div>
                <h2 className="text-6xl font-display font-bold mb-4 tracking-tighter">Prefeitura <span className="text-brand-accent">&</span> Normas</h2>
                <p className="text-brand-ink/60 max-w-2xl leading-relaxed">
                  Consulte parâmetros urbanísticos e taxas municipais de qualquer município do Brasil em tempo real.
                </p>
              </header>

              <form onSubmit={handleCityHallSearch} className="mb-12 flex flex-wrap gap-6 items-end glass-card p-8 rounded-[40px]">
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Cidade</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent" />
                    <input 
                      type="text" 
                      placeholder="Ex: São Paulo"
                      value={citySearch.city}
                      onChange={(e) => setCitySearch({ ...citySearch, city: e.target.value })}
                      className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-3 w-32">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 ml-1">Estado</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-accent" />
                    <input 
                      type="text" 
                      placeholder="Ex: SP"
                      maxLength={2}
                      value={citySearch.state}
                      onChange={(e) => setCitySearch({ ...citySearch, state: e.target.value.toUpperCase() })}
                      className="w-full bg-brand-paper dark:bg-white/5 border border-brand-ink/5 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all font-bold"
                    />
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={cityHallLoading}
                  className="bg-brand-ink text-brand-paper px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-accent transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-brand-ink/10 h-[58px]"
                >
                  {cityHallLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Consultar Plano Diretor
                </motion.button>
              </form>

              {cityHallData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-10 rounded-[48px] border-l-8 border-brand-accent">
                      <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 rounded-3xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                          <MapPin className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-4xl font-display font-bold tracking-tight">{cityHallData.city}, {cityHallData.state}</h3>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mt-1">Parâmetros Urbanísticos Vigentes</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                          { label: 'Taxa de Ocupação (T.O.)', value: cityHallData.occupancyRate, desc: 'Área máxima que a projeção da edificação pode ocupar no terreno.', icon: Maximize },
                          { label: 'Coeficiente de Aproveitamento (C.A.)', value: cityHallData.utilizationCoefficient, desc: 'Relação entre a área total construída e a área do terreno.', icon: Layers },
                          { label: 'Recuo Frontal', value: cityHallData.frontSetback, desc: 'Distância mínima entre a edificação e o alinhamento do lote.', icon: ArrowRight },
                          { label: 'Taxa de Permeabilidade', value: cityHallData.permeabilityRate, desc: 'Área do terreno que deve ser mantida com solo natural.', icon: Droplets },
                        ].map((item, i) => (
                          <div key={i} className="p-8 bg-brand-paper/30 dark:bg-white/5 rounded-[32px] border border-brand-ink/5 group hover:border-brand-accent/30 transition-colors">
                            <item.icon className="w-6 h-6 text-brand-accent mb-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            <p className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">{item.label}</p>
                            <p className="text-4xl font-display font-bold mb-3">{item.value}</p>
                            <p className="text-xs text-brand-ink/60 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-12 p-10 bg-brand-ink text-brand-paper rounded-[48px] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <h4 className="text-2xl font-display font-bold mb-8 flex items-center gap-3 relative z-10">
                          <Info className="w-6 h-6 text-brand-accent" />
                          Legislação de Uso e Ocupação
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                          <div className="space-y-6">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Usos Permitidos</p>
                            <ul className="text-sm space-y-4">
                              {cityHallData.permittedUses.map((use, i) => (
                                <li key={i} className="flex items-start gap-3 opacity-80">
                                  <Check className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                                  {use}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="space-y-6">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-rose-400">Usos Proibidos / Restrições</p>
                            <ul className="text-sm space-y-4">
                              {cityHallData.prohibitedUses.map((use, i) => (
                                <li key={i} className="flex items-start gap-3 opacity-80">
                                  <X className="w-4 h-4 mt-0.5 text-rose-400 flex-shrink-0" />
                                  {use}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-brand-accent text-white p-10 rounded-[48px] shadow-2xl shadow-brand-accent/20 relative overflow-hidden">
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full -mb-16 -mr-16 blur-2xl" />
                      <h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
                        <DollarSign className="w-7 h-7" />
                        Taxas Municipais
                      </h3>
                      <div className="space-y-8">
                        <div className="space-y-5">
                          {cityHallData.estimatedFees.map((fee, i) => (
                            <div key={i} className="flex justify-between items-center border-b border-white/10 pb-4">
                              <span className="text-xs font-bold opacity-80 uppercase tracking-widest">{fee.item}</span>
                              <span className="text-xl font-display font-bold">{fee.cost}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-6">
                          <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-3">Dica do Especialista</p>
                          <div className="bg-white/10 p-6 rounded-3xl border border-white/10 italic text-sm leading-relaxed">
                            &quot;{cityHallData.expertTip}&quot;
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="glass-card p-8 rounded-[40px]">
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-6 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Fontes Consultadas
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {['Plano Diretor Estratégico', 'Código de Obras', 'Lei de Zoneamento', 'GIS Municipal'].map((tag, i) => (
                          <span key={i} className="text-[10px] font-bold uppercase tracking-widest bg-brand-paper dark:bg-white/5 px-4 py-2 rounded-full border border-brand-ink/5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[500px] glass-card rounded-[48px] flex flex-col items-center justify-center text-center p-12 border-dashed border-2">
                  <div className="w-24 h-24 bg-brand-paper dark:bg-white/5 rounded-full flex items-center justify-center mb-8">
                    <Search className="w-10 h-10 text-brand-ink/5" />
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4 tracking-tight">Pronto para Consultar</h3>
                  <p className="text-brand-ink/40 max-w-xs text-sm leading-relaxed">
                    Insira a cidade e o estado para recuperar automaticamente as normas e taxas da prefeitura através de nossa rede de dados municipais.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'executive' && (
            <motion.div 
              key="executive"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest">Documentação Técnica</div>
                  <div className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary rounded-full text-[10px] font-bold uppercase tracking-widest">Projeto Executivo</div>
                </div>
                <h2 className="text-6xl font-display font-bold mb-4 tracking-tighter">Detalhamento <span className="text-brand-accent">2D</span></h2>
                <p className="text-brand-ink/60 max-w-xl">Cortes, fachadas e plantas humanizadas para execução técnica precisa da obra.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-2 glass-card p-8 rounded-[40px] border-l-4 border-brand-accent">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-display font-bold mb-1">Repositório de Arquivos Técnicos</h3>
                      <p className="text-xs text-brand-ink/40 uppercase tracking-widest font-bold">Upload e Gestão de DWG / DXF</p>
                    </div>
                    <button 
                      onClick={() => document.getElementById('exec-dwg-upload')?.click()}
                      className="px-6 py-3 bg-brand-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-brand-accent transition-all shadow-lg"
                    >
                      <Upload className="w-4 h-4" />
                      Novo Arquivo .DWG
                    </button>
                    <input 
                      id="exec-dwg-upload"
                      type="file" 
                      className="hidden" 
                      accept=".dwg" 
                      multiple 
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          const newFiles = Array.from(files).map(f => ({
                            name: f.name,
                            size: (f.size / 1024).toFixed(1) + ' KB'
                          }));
                          setBrief(prev => ({ ...prev, dwgFiles: [...(prev.dwgFiles || []), ...newFiles] }));
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {brief.dwgFiles && brief.dwgFiles.length > 0 ? (
                      brief.dwgFiles.map((f, i) => (
                        <div key={i} className="p-4 bg-brand-paper border border-brand-ink/5 rounded-3xl flex items-center justify-between group hover:border-brand-accent transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-ink/5 flex items-center justify-center text-brand-ink/40 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-colors">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-brand-ink truncate max-w-[120px]">{f.name}</p>
                              <p className="text-[8px] text-brand-ink/40 uppercase tracking-widest font-bold">{f.size}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-brand-ink/40 hover:text-brand-ink"><Download className="w-4 h-4" /></button>
                            <button 
                              onClick={() => setBrief(prev => ({ ...prev, dwgFiles: prev.dwgFiles?.filter((_, idx) => idx !== i) }))}
                              className="p-2 text-rose-500/40 hover:text-rose-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 py-12 text-center border-2 border-dashed border-brand-ink/5 rounded-[32px]">
                        <FileText className="w-12 h-12 text-brand-ink/10 mx-auto mb-4" />
                        <p className="text-xs text-brand-ink/40 font-bold uppercase tracking-widest">Nenhum arquivo técnico anexado</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-4 rounded-[40px] aspect-video relative group overflow-hidden">
                  <img src="https://picsum.photos/seed/facade1/1200/800" className="w-full h-full object-cover rounded-[32px] opacity-40 grayscale" alt="Facade" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                     <div className="w-16 h-16 bg-brand-ink/5 rounded-full flex items-center justify-center mb-4">
                       <Building2 className="w-8 h-8 text-brand-ink/20" />
                     </div>
                     <h3 className="text-xl font-display font-bold mb-2">Fachada Frontal</h3>
                     <p className="text-xs text-brand-ink/40 max-w-xs">Detalhamento de revestimentos, esquadrias e acabamentos externos.</p>
                  </div>
                  <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="px-6 py-3 bg-brand-paper text-brand-ink rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Ver Detalhes de Fachada
                    </button>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-[40px] aspect-video relative group overflow-hidden">
                  <img src="https://picsum.photos/seed/landscape/1200/800" className="w-full h-full object-cover rounded-[32px] opacity-40 grayscale" alt="Landscape" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                     <div className="w-16 h-16 bg-brand-ink/5 rounded-full flex items-center justify-center mb-4">
                       <Droplets className="w-8 h-8 text-brand-ink/20" />
                     </div>
                     <h3 className="text-xl font-display font-bold mb-2">Corte Humanizado & Paisagismo</h3>
                     <p className="text-xs text-brand-ink/40 max-w-xs">Visualização com mobiliário interno e elementos de vegetação externa.</p>
                  </div>
                  <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="px-6 py-3 bg-brand-paper text-brand-ink rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Explorar Paisagismo
                    </button>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-[40px] aspect-video relative group overflow-hidden">
                  <img src="https://picsum.photos/seed/blueprint/1200/800" className="w-full h-full object-cover rounded-[32px] opacity-40 grayscale" alt="Blueprint" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                     <div className="w-16 h-16 bg-brand-ink/5 rounded-full flex items-center justify-center mb-4">
                       <Layout className="w-8 h-8 text-brand-ink/20" />
                     </div>
                     <h3 className="text-xl font-display font-bold mb-2">Planta Baixa Humanizada</h3>
                     <p className="text-xs text-brand-ink/40 max-w-xs">Visualização técnica com mobiliário e texturas para compreensão espacial.</p>
                  </div>
                  <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="px-6 py-3 bg-brand-paper text-brand-ink rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Ampliar Detalhe
                    </button>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-[40px] aspect-video relative group overflow-hidden">
                  <img src="https://picsum.photos/seed/section/1200/800" className="w-full h-full object-cover rounded-[32px] opacity-40 grayscale" alt="Section" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                     <div className="w-16 h-16 bg-brand-ink/5 rounded-full flex items-center justify-center mb-4">
                       <Layers className="w-8 h-8 text-brand-ink/20" />
                     </div>
                     <h3 className="text-xl font-display font-bold mb-2">Cortes Transversais</h3>
                     <p className="text-xs text-brand-ink/40 max-w-xs">Detalhamento de alturas, forros e vãos técnicos.</p>
                  </div>
                  <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="px-6 py-3 bg-brand-paper text-brand-ink rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      <Maximize className="w-4 h-4" />
                      Ampliar Detalhe
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-12 glass-card p-8 rounded-[32px] border-l-4 border-brand-secondary">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-brand-secondary/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-brand-secondary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-display font-bold tracking-tight">Análise Técnica Automática (IA)</h4>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Processado
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="p-4 bg-brand-paper/50 rounded-2xl border border-brand-ink/5">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Cota Ideal Sugerida</p>
                        <p className="text-xl font-display font-bold text-brand-secondary">+1.20m (Nível Zero)</p>
                      </div>
                      <div className="p-4 bg-brand-paper/50 rounded-2xl border border-brand-ink/5">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Taxa de Ocupação</p>
                        <p className="text-xl font-display font-bold text-brand-secondary">58% / 60% (Limite)</p>
                      </div>
                      <div className="p-4 bg-brand-paper/50 rounded-2xl border border-brand-ink/5">
                        <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Área Permeável</p>
                        <p className="text-xl font-display font-bold text-brand-secondary">22% (Atende Normas)</p>
                      </div>
                    </div>
                    <p className="text-xs text-brand-ink/60 leading-relaxed max-w-2xl">
                      Com base no terreno montanhoso e no briefing de "Residência Lagoa", a ArchiMind AI recomenda a implantação na cota +1.20m para minimizar movimentação de terra. Os cortes técnicos A-A e B-B foram pré-configurados com pé-direito duplo na área social.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'brandbook' && (
            <motion.div 
              key="brandbook"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-[10px] font-bold uppercase tracking-widest">Identidade Visual</div>
                  </div>
                  <h2 className="text-6xl font-display font-bold mb-4 tracking-tighter">Brandbook do <span className="text-brand-accent">Projeto</span></h2>
                  <p className="text-brand-ink/60 max-w-xl">Diretrizes visuais, tipografia e tom de voz específicos para a marca deste empreendimento.</p>
                </div>
                <button 
                  onClick={() => setGeneratingBrand(true)}
                  className="bg-brand-ink text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-brand-accent transition-all shadow-xl"
                >
                  {generatingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : <ZapIcon className="w-4 h-4" />}
                  Gerar Brandbook IA
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div className="glass-card p-10 rounded-[48px] border-t-8 border-brand-accent">
                    <h3 className="text-2xl font-display font-bold mb-8">Conceito da Marca</h3>
                    <p className="text-brand-ink/60 leading-relaxed mb-8">
                      A marca "Residência Lagoa" deve transmitir serenidade, exclusividade e integração com a natureza. O uso de formas orgânicas e uma paleta terrosa reforça a conexão com o entorno imediato.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-brand-paper/50 rounded-3xl border border-brand-ink/5">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">Tom de Voz</p>
                        <p className="text-sm font-medium italic">"Sóbrio, Acolhedor, Atemporal"</p>
                      </div>
                      <div className="p-6 bg-brand-paper/50 rounded-3xl border border-brand-ink/5">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">Público-Alvo</p>
                        <p className="text-sm font-medium">Famílias de alto padrão, amantes da natureza.</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-10 rounded-[48px]">
                    <h3 className="text-2xl font-display font-bold mb-8">Tipografia Sugerida</h3>
                    <div className="space-y-8">
                      <div className="flex items-end gap-8 border-b border-brand-ink/5 pb-8">
                        <p className="text-6xl font-serif">Aa</p>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Primária (Títulos)</p>
                          <p className="text-xl font-serif">Playfair Display</p>
                        </div>
                      </div>
                      <div className="flex items-end gap-8">
                        <p className="text-6xl font-sans font-light">Aa</p>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-brand-ink/40">Secundária (Corpo)</p>
                          <p className="text-xl font-sans font-light">Inter Light</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-brand-ink text-white p-10 rounded-[48px] relative overflow-hidden">
                    <h3 className="text-xl font-display font-bold mb-8">Paleta Institucional</h3>
                    <div className="space-y-4">
                      {[
                        { name: 'Verde Musgo', hex: '#2D3A2D', percent: '60%' },
                        { name: 'Areia', hex: '#E5E1D8', percent: '30%' },
                        { name: 'Ouro Velho', hex: '#B5A642', percent: '10%' }
                      ].map((c, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl border border-white/10" style={{ backgroundColor: c.hex }} />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{c.name}</p>
                            <p className="text-xs font-mono">{c.hex}</p>
                          </div>
                          <p className="text-xs font-bold text-brand-accent">{c.percent}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-[40px]">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-6">Aplicações Recomendadas</h4>
                    <ul className="space-y-4">
                      {['Placas de Obra', 'Apresentação ao Cliente', 'Redes Sociais', 'Documentação Técnica'].map((app, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs text-brand-ink/60">
                          <CheckCircle2 className="w-4 h-4 text-brand-accent" />
                          {app}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Brand Strategy Council Journey */}
              <div className="mt-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-brand-ink/10" />
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-ink/40">Brand Strategy Council Journey</h3>
                  <div className="h-px flex-1 bg-brand-ink/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {[
                    { name: 'Al Ries', role: 'Positioning Strategy', icon: <Target className="w-4 h-4" />, desc: 'Definição do lugar único na mente do cliente.' },
                    { name: 'Byron Sharp', role: 'Mental Availability', icon: <ZapIcon className="w-4 h-4" />, desc: 'Maximização do crescimento e alcance.' },
                    { name: 'Jean-Noel Kapferer', role: 'Identity Prism', icon: <Layers className="w-4 h-4" />, desc: 'Construção das 6 facetas da identidade.' },
                    { name: 'Donald Miller', role: 'StoryBrand Framework', icon: <BookOpen className="w-4 h-4" />, desc: 'O cliente como herói da jornada.' },
                    { name: 'Marty Neumeier', role: 'The Brand Gap', icon: <ZapIcon className="w-4 h-4" />, desc: 'Ponte entre estratégia e design.' },
                    { name: 'David Aaker', role: 'Brand Equity', icon: <ShieldCheck className="w-4 h-4" />, desc: 'Gestão do valor e arquitetura da marca.' },
                    { name: 'Kevin Keller', role: 'Strategic Management', icon: <Settings className="w-4 h-4" />, desc: 'Ressonância e fidelidade à marca.' },
                    { name: 'Alina Wheeler', role: 'Identity System', icon: <Palette className="w-4 h-4" />, desc: 'Processo de design de identidade.' },
                    { name: 'Emily Heyward', role: 'Brand Obsession', icon: <Sparkles className="w-4 h-4" />, desc: 'Criação de marcas que as pessoas amam.' },
                    { name: 'Denise Yohn', role: 'Brand-as-Business', icon: <Building2 className="w-4 h-4" />, desc: 'Alinhamento operacional com a marca.' },
                    { name: 'Naming Strategist', role: 'Verbal Identity', icon: <PenTool className="w-4 h-4" />, desc: 'Criação de nomes memoráveis.' },
                    { name: 'Archetype Consultant', role: 'Brand Soul', icon: <Users className="w-4 h-4" />, desc: 'Personalidade e arquétipo central.' },
                    { name: 'Domain Scout', role: 'Digital Presence', icon: <Globe className="w-4 h-4" />, desc: 'Estratégia de domínios e SEO.' },
                    { name: 'Miller Sticky Brand', role: 'Framework Application', icon: <CheckCircle2 className="w-4 h-4" />, desc: 'Aplicação prática do StoryBrand.' },
                    { name: 'Brand Chief', role: 'Creative Direction', icon: <Sparkles className="w-4 h-4" />, desc: 'Supervisão de consistência e visão.' }
                  ].map((expert, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -5 }}
                      className="bg-brand-paper border border-brand-ink/5 p-5 rounded-3xl hover:shadow-xl hover:shadow-brand-ink/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-ink/5 flex items-center justify-center text-brand-ink group-hover:bg-brand-accent group-hover:text-white transition-colors">
                          {expert.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink">{expert.name}</p>
                          <p className="text-[8px] font-bold text-brand-accent uppercase tracking-wider">{expert.role}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-brand-ink/40 leading-relaxed">
                        {expert.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'playbook' && (
            <motion.div 
              key="playbook"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary rounded-full text-[10px] font-bold uppercase tracking-widest">Gestão de Processos</div>
                </div>
                <h2 className="text-6xl font-display font-bold mb-4 tracking-tighter">Playbook de <span className="text-brand-secondary">Execução</span></h2>
                <p className="text-brand-ink/60 max-w-xl">O guia passo-a-passo para garantir a qualidade e o cumprimento dos prazos deste projeto específico.</p>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {playbookPhases.map((phase, i) => (
                      <div key={i} className="glass-card p-8 rounded-[40px] border-t-4 border-brand-secondary">
                        <div className="flex justify-between items-start mb-6">
                          <h3 className="text-xl font-display font-bold">{phase.title}</h3>
                          <span className={cn(
                            "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest",
                            phase.color === 'emerald' ? "bg-emerald-500/10 text-emerald-500" : 
                            phase.color === 'brand-accent' ? "bg-brand-accent/10 text-brand-accent" : 
                            "bg-brand-ink/5 text-brand-ink/40"
                          )}>
                            {phase.status}
                          </span>
                        </div>
                        <ul className="space-y-4">
                          {phase.items.map((item: any, idx: number) => (
                            <li key={idx} className="flex items-center justify-between p-3 bg-brand-ink/5 rounded-xl group hover:bg-brand-ink/10 transition-all">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                                  item.status === 'Concluído' ? "bg-emerald-500 text-white" : 
                                  item.status === 'Em Andamento' ? "bg-brand-accent text-white" : 
                                  "bg-brand-ink/10 text-brand-ink/40"
                                )}>
                                  {idx + 1}
                                </span>
                                <span className={cn(
                                  "text-sm transition-all",
                                  item.status === 'Concluído' ? "text-brand-ink/40 line-through" : "text-brand-ink/80"
                                )}>{item.text}</span>
                              </div>
                              <select 
                                value={item.status}
                                onChange={(e) => updateItemStatus(i, idx, e.target.value)}
                                className={cn(
                                  "text-[8px] font-bold uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer transition-colors",
                                  item.status === 'Concluído' ? "text-emerald-500" : 
                                  item.status === 'Em Andamento' ? "text-brand-accent" : 
                                  "text-brand-ink/40 hover:text-brand-accent"
                                )}
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Concluído">Concluído</option>
                              </select>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-brand-secondary text-white p-10 rounded-[48px] shadow-2xl shadow-brand-secondary/20">
                    <h3 className="text-xl font-display font-bold mb-8">Checklist de Qualidade</h3>
                    <div className="space-y-6">
                      {[
                        'Conferência de Níveis',
                        'Teste de Estanqueidade',
                        'Prumo de Paredes',
                        'Esquadro de Vãos'
                      ].map((check, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-6 h-6 rounded-lg border-2 border-white/20 flex items-center justify-center">
                            {i < 2 && <Check className="w-4 h-4" />}
                          </div>
                          <span className="text-xs font-medium opacity-80">{check}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-card p-8 rounded-[40px] bg-rose-50 border-rose-100">
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-rose-600 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Pontos de Atenção
                    </h4>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Atenção especial à impermeabilização da laje superior devido ao alto índice pluviométrico da região.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 lg:p-12 max-w-3xl mx-auto min-h-full"
            >
              <header className="mb-12">
                <h2 className="text-5xl font-serif font-light mb-4">Configurações</h2>
                <p className="text-brand-ink/60">Personalize sua identidade profissional na plataforma.</p>
              </header>

              <div className="space-y-8">
                <div className="bg-brand-paper p-8 rounded-3xl border border-brand-ink/5 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-brand-ink/50">Nome Profissional / Escritório</label>
                    <input 
                      type="text" 
                      value={professionalInfo.name}
                      onChange={e => setProfessionalInfo({...professionalInfo, name: e.target.value})}
                      className="w-full bg-brand-paper/50 border border-brand-ink/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-brand-ink/50">Registro Profissional (CAU/ABD)</label>
                    <input 
                      type="text" 
                      value={professionalInfo.registration}
                      onChange={e => setProfessionalInfo({...professionalInfo, registration: e.target.value})}
                      className="w-full bg-brand-paper/50 border border-brand-ink/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-brand-ink/50">Logo do Escritório</label>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-ink/10 rounded-xl p-6 cursor-pointer hover:border-brand-accent transition-colors">
                        {professionalInfo.logo ? (
                          <img src={professionalInfo.logo} className="h-12 object-contain" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-brand-ink/20" />
                            <span className="text-[10px] text-brand-ink/40">Upload Logo</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setProfessionalInfo({...professionalInfo, logo: reader.result as string});
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-brand-ink/50">Assinatura Digital</label>
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-brand-ink/10 rounded-xl p-6 cursor-pointer hover:border-brand-accent transition-colors">
                        {professionalInfo.signature ? (
                          <img src={professionalInfo.signature} className="h-12 object-contain" />
                        ) : (
                          <>
                            <PenTool className="w-6 h-6 text-brand-ink/20" />
                            <span className="text-[10px] text-brand-ink/40">Upload Assinatura</span>
                          </>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setProfessionalInfo({...professionalInfo, signature: reader.result as string});
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'clients' && (
            <motion.div 
              key="clients"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-5xl font-serif font-light mb-4 text-brand-ink">Gestão de Clientes</h2>
                  <p className="text-brand-ink/60">CRM Integrado para acompanhamento de leads e projetos.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="flex bg-brand-paper border border-brand-ink/10 rounded-xl p-1 shrink-0">
                    <button 
                      onClick={() => setCrmView('table')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        crmView === 'table' ? "bg-brand-ink text-white" : "text-brand-ink/40 hover:text-brand-ink"
                      )}
                    >
                      <Layout className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setCrmView('kanban')}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        crmView === 'kanban' ? "bg-brand-ink text-white" : "text-brand-ink/40 hover:text-brand-ink"
                      )}
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-ink/20" />
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-brand-paper border border-brand-ink/10 rounded-xl text-xs focus:outline-none focus:border-brand-accent transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddingClient(true)}
                    className="bg-brand-accent text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-brand-ink transition-all shadow-xl shadow-brand-accent/20 shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Novo Cliente
                  </button>
                </div>
              </header>

              <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {['Todos', 'Ativo', 'Lead', 'Negociação', 'Finalizado'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setClientFilter(filter)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      clientFilter === filter 
                        ? "bg-brand-ink text-brand-paper shadow-lg" 
                        : "bg-brand-paper border border-brand-ink/5 text-brand-ink/40 hover:border-brand-ink/20"
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Total de Clientes</p>
                  <p className="text-3xl font-serif text-brand-ink">{clients.length}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Pipeline Total</p>
                  <p className="text-3xl font-serif text-brand-ink">R$ {clients.reduce((acc, c) => acc + c.value, 0).toLocaleString()}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Leads Ativos</p>
                  <p className="text-3xl font-serif text-brand-ink">{clients.filter(c => c.status === 'Lead').length}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-serif text-brand-ink">68%</p>
                </div>
              </div>

              {crmView === 'table' ? (
                <div className="bg-brand-paper rounded-[32px] border border-brand-ink/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-brand-ink/5">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Cliente</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Etapa</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Prioridade</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Valor do Projeto</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-ink/5">
                        {clients
                          .filter(c => clientFilter === 'Todos' || c.status === clientFilter)
                          .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.project.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map(client => (
                          <tr key={client.id} className="hover:bg-brand-ink/5 transition-colors cursor-pointer" onClick={() => setSelectedClient(client)}>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-brand-ink">{client.name}</p>
                              <p className="text-[10px] text-brand-ink/40">{client.project}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                                client.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" :
                                client.status === 'Lead' ? "bg-blue-100 text-blue-700" :
                                client.status === 'Negociação' ? "bg-amber-100 text-amber-700" :
                                "bg-brand-ink/10 text-brand-ink/60"
                              )}>
                                {client.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-brand-accent" />
                                <span className="text-xs text-brand-ink/60">{client.stage}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest",
                                client.priority === 'Alta' ? "text-rose-500" :
                                client.priority === 'Média' ? "text-amber-500" :
                                "text-emerald-500"
                              )}>
                                {client.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-brand-ink">
                              R$ {client.value.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-brand-paper rounded-lg transition-colors text-brand-ink/20 hover:text-brand-accent">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-brand-paper rounded-lg transition-colors text-brand-ink/20 hover:text-brand-accent">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-6">
                  {['Lead', 'Negociação', 'Ativo', 'Finalizado'].map(status => (
                    <div key={status} className="flex flex-col gap-4 min-w-[280px]">
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">{status}</h3>
                          <span className="bg-brand-ink/5 px-2 py-0.5 rounded text-[10px] font-bold text-brand-ink/40">
                            {clients.filter(c => c.status === status).length}
                          </span>
                        </div>
                        <button className="text-brand-ink/20 hover:text-brand-accent transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        {clients
                          .filter(c => c.status === status)
                          .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                          .map(client => (
                          <motion.div
                            key={client.id}
                            layoutId={client.id}
                            onClick={() => setSelectedClient(client)}
                            className="bg-brand-paper p-5 rounded-3xl border border-brand-ink/5 shadow-sm hover:shadow-xl hover:shadow-brand-ink/5 transition-all cursor-pointer group"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <span className={cn(
                                "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                                client.priority === 'Alta' ? "bg-rose-100 text-rose-600" :
                                client.priority === 'Média' ? "bg-amber-100 text-amber-600" :
                                "bg-emerald-100 text-emerald-600"
                              )}>
                                {client.priority}
                              </span>
                              <p className="text-[10px] font-mono text-brand-ink/20">#{client.id.slice(-4)}</p>
                            </div>
                            <h4 className="text-sm font-bold text-brand-ink mb-1 group-hover:text-brand-accent transition-colors">{client.name}</h4>
                            <p className="text-[10px] text-brand-ink/40 mb-4">{client.project}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-brand-ink/5">
                              <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full bg-brand-accent flex items-center justify-center text-[8px] text-white font-bold border-2 border-brand-paper">
                                  {client.name.charAt(0)}
                                </div>
                              </div>
                              <p className="text-xs font-bold text-brand-ink">R$ {client.value.toLocaleString()}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'financial' && (
            <motion.div 
              key="financial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 lg:p-12 max-w-7xl mx-auto min-h-full"
            >
              <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-5xl font-serif font-light mb-4 text-brand-ink">Financeiro & DRE</h2>
                  <p className="text-brand-ink/60">Demonstração do Resultado do Exercício e Gestão de Fluxo.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button className="flex-1 md:flex-none bg-brand-paper border border-brand-ink/10 text-brand-ink px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-brand-ink hover:text-white transition-all">
                    <Download className="w-4 h-4" />
                    Exportar DRE
                  </button>
                  <button 
                    onClick={() => {
                      const newTransaction = {
                        id: Date.now().toString(),
                        date: new Date().toLocaleDateString(),
                        description: 'Nova Transação IA',
                        category: 'Consultoria',
                        amount: 5000,
                        type: 'income',
                        project: 'Residência Lagoa'
                      };
                      setFinancialTransactions([newTransaction, ...financialTransactions]);
                    }}
                    className="flex-1 md:flex-none bg-brand-accent text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-brand-ink transition-all shadow-xl shadow-brand-accent/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Nova Transação
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Receita Bruta (Mês)</p>
                  <p className="text-3xl font-serif text-emerald-600">R$ {totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Despesas Operacionais</p>
                  <p className="text-3xl font-serif text-rose-600">R$ {totalExpense.toLocaleString()}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Lucro Líquido</p>
                  <p className="text-3xl font-serif text-brand-accent">R$ {netProfit.toLocaleString()}</p>
                </div>
                <div className="bg-brand-paper p-6 rounded-3xl border border-brand-ink/5">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-1">Margem de Lucro</p>
                  <p className="text-3xl font-serif text-brand-ink">{profitMargin.toFixed(1)}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 bg-brand-paper p-8 rounded-[40px] border border-brand-ink/5">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Fluxo de Caixa Mensal</h3>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold uppercase text-brand-ink/40">Receitas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-bold uppercase text-brand-ink/40">Despesas</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Jan', income: 12000, expense: 4000 },
                        { name: 'Fev', income: 18000, expense: 5000 },
                        { name: 'Mar', income: 23000, expense: 9750 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                          cursor={{fill: 'rgba(0,0,0,0.02)'}}
                        />
                        <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-brand-paper p-8 rounded-[40px] border border-brand-ink/5">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-8 text-center">Distribuição de Despesas</h3>
                  <div className="h-72 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#F27D26', '#141414', '#8E9299', '#10b981', '#f43f5e', '#3b82f6'][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Total</p>
                      <p className="text-xl font-serif">R$ {totalExpense.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                <div className="lg:col-span-2 bg-brand-paper p-8 rounded-[40px] border border-brand-ink/5">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Rentabilidade por Projeto</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-accent" />
                      <span className="text-[10px] font-bold uppercase text-brand-ink/40">Margem (%)</span>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        layout="vertical"
                        data={[
                          { name: 'Residência Lagoa', margin: 82 },
                          { name: 'Apartamento Loft', margin: 65 },
                          { name: 'Edifício Corporate', margin: 45 },
                          { name: 'Casa de Campo', margin: 78 },
                        ]}
                        margin={{ left: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                        <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10}} width={120} />
                        <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}}
                          cursor={{fill: 'rgba(0,0,0,0.02)'}}
                        />
                        <Bar dataKey="margin" fill="#F27D26" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-brand-paper p-8 rounded-[40px] border border-brand-ink/5">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 mb-8">Metas do Trimestre</h3>
                  <div className="space-y-8">
                    {[
                      { label: 'Faturamento', current: 45000, goal: 60000, color: 'bg-brand-accent' },
                      { label: 'Novos Contratos', current: 3, goal: 5, color: 'bg-emerald-500' },
                      { label: 'Redução de Custos', current: 15, goal: 20, color: 'bg-rose-500', unit: '%' }
                    ].map((meta, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-xs font-bold text-brand-ink">{meta.label}</p>
                          <p className="text-[10px] font-mono text-brand-ink/40">
                            {meta.unit === '%' ? `${meta.current}% / ${meta.goal}%` : `R$ ${meta.current.toLocaleString()} / R$ ${meta.goal.toLocaleString()}`}
                          </p>
                        </div>
                        <div className="h-2 bg-brand-ink/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(meta.current / meta.goal) * 100}%` }}
                            className={cn("h-full rounded-full", meta.color)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-brand-paper rounded-[32px] border border-brand-ink/5 overflow-hidden">
                <div className="p-6 border-b border-brand-ink/5 flex justify-between items-center">
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Extrato Detalhado</h3>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-brand-ink/5 text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 hover:bg-brand-ink/10 transition-all">Este Mês</button>
                    <button className="px-3 py-1.5 rounded-lg bg-brand-ink/5 text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 hover:bg-brand-ink/10 transition-all">Filtros</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-brand-ink/5">
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Data</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Descrição</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Categoria</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Projeto</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-brand-ink/40 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-ink/5">
                      {financialTransactions.map(t => (
                        <tr key={t.id} className="hover:bg-brand-ink/5 transition-colors">
                          <td className="px-6 py-4 text-xs text-brand-ink/60">{t.date}</td>
                          <td className="px-6 py-4 text-sm font-medium text-brand-ink">{t.description}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] bg-brand-ink/5 px-2 py-1 rounded text-brand-ink/60 font-medium">{t.category}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-ink/40 italic">{t.project || '-'}</td>
                          <td className={cn(
                            "px-6 py-4 text-sm font-bold text-right",
                            t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Strategy Council Journey */}
              <div className="mt-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-brand-ink/10" />
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-ink/40">Data Strategy Council Journey</h3>
                  <div className="h-px flex-1 bg-brand-ink/10" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                    { name: 'Avinash Kaushik', role: 'Web Analytics 2.0', icon: <TrendingUp className="w-4 h-4" />, desc: 'Foco em decisões baseadas em dados e insights acionáveis.' },
                    { name: 'Peter Fader', role: 'Customer Centricity', icon: <Users className="w-4 h-4" />, desc: 'Análise de CLV (Customer Lifetime Value) e retenção.' },
                    { name: 'Sean Ellis', role: 'Growth Hacking', icon: <ZapIcon className="w-4 h-4" />, desc: 'Identificação e otimização da North Star Metric.' },
                    { name: 'Wes Kao', role: 'Cohort Analysis', icon: <Layers className="w-4 h-4" />, desc: 'Análise rigorosa de dados para crescimento e educação.' },
                    { name: 'Nick Mehta', role: 'Customer Success', icon: <Smile className="w-4 h-4" />, desc: 'Métricas de churn, saúde do cliente e expansão.' },
                    { name: 'David Spinks', role: 'Community ROI', icon: <Globe className="w-4 h-4" />, desc: 'Mensuração do impacto e engajamento da comunidade.' },
                    { name: 'Data Chief', role: 'Data Governance', icon: <ShieldCheck className="w-4 h-4" />, desc: 'Estratégia global, segurança e integridade dos dados.' }
                  ].map((expert, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -5 }}
                      className="bg-brand-paper border border-brand-ink/5 p-5 rounded-3xl hover:shadow-xl hover:shadow-brand-ink/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-ink/5 flex items-center justify-center text-brand-ink group-hover:bg-brand-accent group-hover:text-white transition-colors">
                          {expert.icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-ink">{expert.name}</p>
                          <p className="text-[8px] font-bold text-brand-accent uppercase tracking-wider">{expert.role}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-brand-ink/40 leading-relaxed">
                        {expert.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client Details Modal */}
        <AnimatePresence>
          {selectedClient && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-brand-ink/40 backdrop-blur-sm"
              onClick={() => setSelectedClient(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-brand-paper w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-8 bg-brand-ink text-white relative">
                  <button 
                    onClick={() => setSelectedClient(null)}
                    className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-brand-accent flex items-center justify-center text-3xl font-serif">
                      {selectedClient.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-serif mb-1">{selectedClient.name}</h2>
                      <div className="flex gap-4">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {selectedClient.project}
                        </span>
                        <span className={cn(
                          "text-[10px] uppercase tracking-widest font-bold flex items-center gap-1",
                          selectedClient.status === 'Ativo' ? "text-emerald-400" : "text-blue-400"
                        )}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                          {selectedClient.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAnalyzeClient(selectedClient)}
                    disabled={isAnalyzingClient}
                    className="absolute bottom-6 right-6 bg-brand-accent text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-brand-ink transition-all shadow-lg disabled:opacity-50"
                  >
                    {isAnalyzingClient ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Analisar com IA
                  </button>
                </div>

                <div className="p-8 grid grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-3">Informações de Contato</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm text-brand-ink/60">
                          <Mail className="w-4 h-4" />
                          {selectedClient.email}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-brand-ink/60">
                          <Phone className="w-4 h-4" />
                          {selectedClient.phone}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-3">Detalhes do Projeto</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-brand-ink/5 rounded-xl">
                          <span className="text-xs text-brand-ink/40">Valor Total</span>
                          <span className="text-sm font-bold">R$ {selectedClient.value.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-brand-ink/5 rounded-xl">
                          <span className="text-xs text-brand-ink/40">Etapa Atual</span>
                          <span className="text-sm font-bold">{selectedClient.stage}</span>
                        </div>
                      </div>
                    </div>

                    {selectedClient.payment && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-3">Pagamento</h4>
                        <div className="p-4 bg-brand-paper border border-brand-ink/5 rounded-2xl space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-brand-ink/40">Método</span>
                            <span className="font-bold">{selectedClient.payment.method}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-brand-ink/40">Parcelas</span>
                            <span className="font-bold">{selectedClient.payment.installments}x</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-brand-ink/40">Vencimento</span>
                            <span className="font-bold">Dia {selectedClient.payment.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {selectedClient.projectStages && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-3">Cronograma de Etapas</h4>
                        <div className="space-y-3">
                          {selectedClient.projectStages.map((stage) => (
                            <div 
                              key={stage.id} 
                              onClick={() => {
                                const nextStatus = stage.status === 'Pendente' ? 'Em Andamento' : stage.status === 'Em Andamento' ? 'Concluído' : 'Pendente';
                                setClients(prev => prev.map(c => c.id === selectedClient.id ? {
                                  ...c,
                                  projectStages: c.projectStages?.map(s => s.id === stage.id ? { ...s, status: nextStatus as any, completedDate: nextStatus === 'Concluído' ? new Date().toISOString().split('T')[0] : undefined } : s)
                                } : c));
                                setSelectedClient(prev => prev ? {
                                  ...prev,
                                  projectStages: prev.projectStages?.map(s => s.id === stage.id ? { ...s, status: nextStatus as any, completedDate: nextStatus === 'Concluído' ? new Date().toISOString().split('T')[0] : undefined } : s)
                                } : null);
                              }}
                              className="flex items-center justify-between p-3 bg-brand-paper border border-brand-ink/5 rounded-xl group hover:border-brand-accent transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  stage.status === 'Concluído' ? "bg-emerald-500" : stage.status === 'Em Andamento' ? "bg-brand-accent animate-pulse" : "bg-brand-ink/10"
                                )} />
                                <div>
                                  <p className="text-xs font-bold">{stage.label}</p>
                                  <p className="text-[8px] text-brand-ink/40 uppercase tracking-widest">Acordado: {stage.agreedDate}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {stage.status === 'Concluído' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                <span className={cn(
                                  "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                                  stage.status === 'Concluído' ? "bg-emerald-500/10 text-emerald-600" : stage.status === 'Em Andamento' ? "bg-brand-accent/10 text-brand-accent" : "bg-brand-ink/5 text-brand-ink/40"
                                )}>
                                  {stage.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-3">Atividade Recente</h4>
                      <div className="space-y-4">
                        {selectedClient.timeline?.map((item: any, i: number) => (
                          <div key={i} className="flex gap-3 relative">
                            {i !== selectedClient.timeline.length - 1 && (
                              <div className="absolute left-2 top-6 bottom-0 w-px bg-brand-ink/5" />
                            )}
                            <div className="w-4 h-4 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-brand-ink">{item.text}</p>
                              <p className="text-[10px] text-brand-ink/40">{item.date} • {item.type}</p>
                            </div>
                          </div>
                        )) || (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                              <Calendar className="w-4 h-4 text-brand-accent" />
                            </div>
                            <div>
                              <p className="text-xs font-bold">Último Contato</p>
                              <p className="text-[10px] text-brand-ink/40">{selectedClient.lastContact}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-brand-ink/5">
                      <div className="flex gap-3">
                        <button className="flex-1 bg-brand-ink text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-all">
                          Agendar Reunião
                        </button>
                        <button className="flex-1 bg-brand-paper border border-brand-ink/10 text-brand-ink py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-ink hover:text-white transition-all">
                          Enviar Proposta
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {clientAnalysis && (
                  <div className="px-8 pb-8">
                    <div className="p-8 bg-brand-accent/5 rounded-[40px] border border-brand-accent/20">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Análise Estratégica IA
                        </h4>
                        <div className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          clientAnalysis.conversionPotential === 'Alto' ? "bg-emerald-500/10 text-emerald-500" :
                          clientAnalysis.conversionPotential === 'Médio' ? "bg-amber-500/10 text-amber-500" :
                          "bg-rose-500/10 text-rose-500"
                        )}>
                          Potencial: {clientAnalysis.conversionPotential}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-3">Principais Dores & Necessidades</p>
                            <div className="flex flex-wrap gap-2">
                              {clientAnalysis.mainPains.map((pain, i) => (
                                <span key={i} className="px-3 py-1.5 bg-brand-paper border border-brand-ink/5 rounded-xl text-[10px] font-medium text-brand-ink/70">
                                  {pain}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40 mb-3">Sugestão de Abordagem</p>
                            <p className="text-sm text-brand-ink/70 leading-relaxed italic">
                              "{clientAnalysis.approachSuggestion}"
                            </p>
                          </div>
                        </div>

                        <div className="bg-brand-paper/50 p-6 rounded-3xl border border-brand-ink/5 flex flex-col justify-center">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[8px] uppercase tracking-widest font-bold text-brand-ink/40">Dica de Fechamento</p>
                              <p className="text-xs font-bold text-brand-ink">O Fechamento de Ouro</p>
                            </div>
                          </div>
                          <p className="text-sm text-brand-ink/80 font-medium leading-relaxed">
                            {clientAnalysis.closingTip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 bg-brand-ink/5 flex justify-end gap-3">
                  <button className="px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-brand-ink/40 hover:bg-brand-ink/5 transition-all">Editar</button>
                  <button className="px-6 py-2 rounded-xl bg-brand-ink text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-all">Ver Projeto</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Details Modal */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-brand-ink/40 backdrop-blur-sm"
              onClick={() => setSelectedProject(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-brand-paper w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative h-80">
                  <img src={selectedProject.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => setSelectedProject(null)}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                    <div>
                      <h2 className="text-4xl font-serif text-white mb-2">{selectedProject.clientName}</h2>
                      <p className="text-white/60 text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedProject.location.city}, {selectedProject.location.state}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleShare(selectedProject)}
                      className="bg-white/20 backdrop-blur-md text-white p-4 rounded-2xl hover:bg-brand-accent transition-all group"
                      title="Compartilhar Conceito"
                    >
                      <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
                
                <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">O Conceito</h4>
                      <p className="text-sm leading-relaxed text-brand-ink/80">{selectedProject.concept.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-2">Materiais Selecionados</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.concept.materials.map((m: string, i: number) => (
                          <span key={i} className="text-xs bg-brand-paper border border-brand-ink/5 px-3 py-1.5 rounded-full text-brand-ink">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {selectedProject.concept.regulations && (
                      <div className="bg-brand-accent/5 p-6 rounded-2xl border border-brand-accent/10">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-3 flex items-center gap-2">
                          <Info className="w-3 h-3" />
                          Normas Locais
                        </h4>
                        <p className="text-xs leading-relaxed text-brand-ink/70">{selectedProject.concept.regulations.summary}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-4">Paleta de Cores</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedProject.concept.colorPalette.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 bg-brand-paper p-3 rounded-xl border border-brand-ink/5">
                            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: c.hex }} />
                            <div className="flex-1">
                              <p className="text-xs font-bold uppercase tracking-wider">{c.name}</p>
                              <p className="text-[10px] text-brand-ink/40 font-mono">{c.hex}</p>
                            </div>
                            <button 
                              onClick={() => copyToClipboard(c.hex)}
                              className="p-2 hover:bg-brand-paper rounded-lg transition-colors"
                            >
                              {copiedColor === c.hex ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-brand-ink/20" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-accent mb-3">Estilos Aplicados</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.styles.map((s: string) => (
                          <span key={s} className="text-[10px] bg-brand-ink text-brand-paper px-3 py-1 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Client Modal */}
        <AnimatePresence>
          {isAddingClient && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-brand-ink/40 backdrop-blur-sm"
              onClick={() => setIsAddingClient(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-brand-paper w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-8 border-b border-brand-ink/5 flex justify-between items-center">
                  <h3 className="text-2xl font-display font-bold">Novo Cliente</h3>
                  <button onClick={() => setIsAddingClient(false)} className="text-brand-ink/20 hover:text-brand-accent transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form 
                  className="p-8 space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newClient: Client = {
                      id: Date.now().toString(),
                      name: formData.get('name') as string,
                      email: formData.get('email') as string,
                      phone: formData.get('phone') as string,
                      project: formData.get('project') as string,
                      status: 'Lead',
                      value: Number(formData.get('value')),
                      stage: 'Briefing',
                      priority: formData.get('priority') as string,
                      lastContact: 'Hoje',
                      timeline: [{ date: 'Hoje', type: 'system', text: 'Lead criado no CRM.' }],
                      payment: {
                        method: formData.get('paymentMethod') as string,
                        installments: Number(formData.get('installments') || 0),
                        dueDate: Number(formData.get('dueDate') || 1)
                      },
                      projectStages: [
                        { id: '1', label: 'Briefing', agreedDate: formData.get('stageDate_1') as string || 'TBD', status: 'Pendente' },
                        { id: '2', label: 'Conceito', agreedDate: formData.get('stageDate_2') as string || 'TBD', status: 'Pendente' },
                        { id: '3', label: 'Executivo', agreedDate: formData.get('stageDate_3') as string || 'TBD', status: 'Pendente' },
                        { id: '4', label: 'Aprovação Final', agreedDate: formData.get('stageDate_4') as string || 'TBD', status: 'Pendente' }
                      ]
                    };
                    setClients([newClient, ...clients]);
                    setIsAddingClient(false);
                  }}
                >
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Nome Completo</label>
                      <input name="name" required className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">E-mail</label>
                      <input name="email" type="email" required className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Telefone</label>
                      <input name="phone" required className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Nome do Projeto</label>
                      <input name="project" required className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Valor Estimado</label>
                      <input name="value" type="number" required className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Prioridade</label>
                      <select name="priority" className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent">
                        <option>Baixa</option>
                        <option>Média</option>
                        <option>Alta</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Tipo de Terreno</label>
                      <select 
                        name="terrainType" 
                        className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent"
                        onChange={(e) => {
                          const terrain = e.target.value;
                          let idealQuote = "";
                          if (terrain === "Aclive") idealQuote = "+1.50m";
                          else if (terrain === "Declive") idealQuote = "-1.20m";
                          else if (terrain === "Plano") idealQuote = "+0.30m";
                          else if (terrain === "Irregular") idealQuote = "+0.80m";
                          
                          const quoteInput = document.getElementsByName('idealQuote')[0] as HTMLInputElement;
                          if (quoteInput) quoteInput.value = idealQuote;
                        }}
                      >
                        <option value="">Selecione...</option>
                        <option value="Plano">Plano</option>
                        <option value="Aclive">Aclive</option>
                        <option value="Declive">Declive</option>
                        <option value="Irregular">Irregular</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Cota Ideal (Auto-fill)</label>
                      <input name="idealQuote" placeholder="Ex: +1.20m" className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Forma de Pagamento</label>
                      <div className="grid grid-cols-3 gap-4">
                        <select name="paymentMethod" className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent">
                          <option value="À Vista">À Vista</option>
                          <option value="Parcelado">Parcelado</option>
                          <option value="Financiado">Financiado</option>
                        </select>
                        <input name="installments" type="number" placeholder="Nº Parcelas" className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                        <input name="dueDate" type="number" placeholder="Dia Venc." className="w-full bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Etapas & Datas Acordadas</label>
                      <div className="space-y-2">
                        {[
                          { id: '1', label: 'Briefing' },
                          { id: '2', label: 'Conceito' },
                          { id: '3', label: 'Executivo' },
                          { id: '4', label: 'Aprovação Final' }
                        ].map(stage => (
                          <div key={stage.id} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold w-20">{stage.label}</span>
                            <input name={`stageDate_${stage.id}`} type="date" className="flex-1 bg-brand-paper border border-brand-ink/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-brand-accent" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/40">Projeto .DWG (Opcional)</label>
                      <div className="flex items-center gap-4 p-4 border-2 border-dashed border-brand-ink/10 rounded-xl hover:border-brand-accent transition-colors cursor-pointer relative group">
                        <Upload className="w-5 h-5 text-brand-ink/20 group-hover:text-brand-accent transition-colors" />
                        <span className="text-xs text-brand-ink/40 group-hover:text-brand-ink/60 transition-colors">Arraste ou clique para upload do DWG</span>
                        <input type="file" accept=".dwg" className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-brand-accent text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-ink transition-all shadow-xl shadow-brand-accent/20">
                    Cadastrar Cliente
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer References */}
        <footer className="p-12 border-t border-brand-ink/5 bg-brand-paper/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <h1 className="text-2xl font-serif font-semibold tracking-tight flex items-center gap-2 mb-6">
                <Sparkles className="w-6 h-6 text-brand-accent" />
                ArchiMind
              </h1>
              <p className="text-xs text-brand-ink/40 leading-relaxed max-w-sm">
                Plataforma de inteligência artificial para arquitetos e designers. 
                Otimizando a criatividade e a precisão técnica desde o briefing até o projeto executivo.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-6">Referências & Mídia</h4>
              <ul className="space-y-3">
                {[
                  { name: 'ArchDaily', url: 'https://www.archdaily.com' },
                  { name: 'Dezeen', url: 'https://www.dezeen.com' },
                  { name: 'Designboom', url: 'https://www.designboom.com' },
                  { name: 'Architectural Digest', url: 'https://www.architecturaldigest.com' }
                ].map(ref => (
                  <li key={ref.name}>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-ink/60 hover:text-brand-accent transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      {ref.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-ink/30 mb-6">Canais de Design</h4>
              <ul className="space-y-3">
                {[
                  { name: 'Casacor', url: 'https://casacor.abril.com.br' },
                  { name: 'Archello', url: 'https://archello.com' },
                  { name: 'Yellowtrace', url: 'https://www.yellowtrace.com.au' },
                  { name: 'Architizer', url: 'https://architizer.com' }
                ].map(ref => (
                  <li key={ref.name}>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-ink/60 hover:text-brand-accent transition-colors flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      {ref.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-brand-ink/5 flex justify-between items-center">
            <p className="text-[10px] text-brand-ink/20 uppercase tracking-widest font-bold">© 2026 ArchiMind AI - Vitruvian Intelligence</p>
            <div className="flex gap-6">
              <a href="#" className="text-[10px] text-brand-ink/20 hover:text-brand-accent transition-colors font-bold uppercase tracking-widest">Privacidade</a>
              <a href="#" className="text-[10px] text-brand-ink/20 hover:text-brand-accent transition-colors font-bold uppercase tracking-widest">Termos</a>
            </div>
          </div>
        </footer>
      </main>

      <AnimatePresence>
        {presentationMode && currentConcept && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-brand-paper flex flex-col items-center justify-center p-8 md:p-20"
          >
            {/* Presentation Background */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="fibonacci-spiral border-brand-accent/20" />
            </div>

            <button 
              onClick={() => setPresentationMode(false)}
              className="absolute top-10 right-10 p-4 hover:bg-brand-ink/5 rounded-full transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="max-w-4xl w-full relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={presentationStep}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  className="space-y-12 text-center"
                >
                  <div className="w-24 h-24 bg-brand-accent/10 text-brand-accent rounded-[32px] flex items-center justify-center mx-auto mb-12">
                    {presentationItems[presentationStep].icon}
                  </div>
                  <h2 className="text-5xl md:text-7xl font-serif font-bold tracking-tighter">
                    {presentationItems[presentationStep].title}
                  </h2>
                  <p className="text-xl md:text-2xl text-brand-ink/60 leading-relaxed font-light italic">
                    {presentationItems[presentationStep].content}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-24 flex items-center justify-between">
                <div className="flex gap-2">
                  {presentationItems.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        i === presentationStep ? "w-12 bg-brand-accent" : "w-3 bg-brand-ink/10"
                      )}
                    />
                  ))}
                </div>
                <button 
                  onClick={nextPresentationStep}
                  className="px-10 py-5 bg-brand-ink text-brand-paper rounded-2xl font-bold uppercase tracking-widest text-sm hover:bg-brand-accent transition-all flex items-center gap-4 shadow-2xl shadow-brand-ink/20"
                >
                  {presentationStep === presentationItems.length - 1 ? "Finalizar" : "Próximo"}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <motion.button 
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
        active 
          ? "bg-brand-ink text-brand-paper shadow-xl shadow-brand-ink/20" 
          : "text-brand-ink/60 hover:bg-brand-accent/10 hover:text-brand-accent"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
        active ? "bg-brand-paper/10" : "bg-brand-ink/5"
      )}>
        {icon}
      </div>
      {label}
    </motion.button>
  );
}

function ProjectCard({ project, onClick }: { project: any, onClick: () => void }) {
  return (
    <motion.div 
      layout
      whileHover={{ y: -8 }}
      onClick={onClick}
      className="group glass-card rounded-[32px] overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer"
    >
      <div className="aspect-[4/3] overflow-hidden relative">
        <img 
          src={project.image || `https://picsum.photos/seed/${project.id}/800/600`} 
          alt={project.clientName} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
          <p className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            Ver detalhes <ArrowRight className="w-4 h-4" />
          </p>
        </div>
        <div className="absolute top-6 right-6 bg-brand-accent text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-brand-accent/20">
          {project.projectType}
        </div>
      </div>
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <h4 className="text-2xl font-display font-bold tracking-tight text-brand-ink">{project.clientName}</h4>
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink/30">{project.date}</span>
        </div>
        <p className="text-sm text-brand-ink/50 line-clamp-2 mb-6 leading-relaxed">
          {project.concept?.description || "Conceito arquitetônico em fase de desenvolvimento criativo..."}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {project.concept?.colorPalette?.slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-paper shadow-sm" style={{ backgroundColor: c.hex }} />
            ))}
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-ink/5 flex items-center justify-center text-brand-ink/20">
            <Plus className="w-4 h-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
