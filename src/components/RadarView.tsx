import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { MasterProfile, DigitalCard, PeerNode, CRMContact, ContactSource, CRMStatus, RadarRoomPublicInfo, SubscriptionState } from '../types';
import { isWebNfcSupported, startNfcReader, NfcReadResult } from '../services/nfc';
import { extractSelectiveContactData } from '../utils/selectiveSharing';
import { apiFetch, getWebSocketUrl } from '../utils/apiConfig';
import {
  Radio,
  Wifi,
  Bluetooth,
  Smartphone,
  ArrowRightLeft,
  CheckCircle2,
  Users,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ScanLine,
  Zap,
  Check,
  AlertCircle,
  Inbox,
  QrCode as QrIcon,
  Copy,
  X,
  Share2,
  Laptop,
  CheckCircle,
  Lock,
  Unlock,
  Clock,
  Plus,
  Key,
  Timer,
  Eye,
  EyeOff,
  DoorOpen,
  ShieldAlert,
  Trash2,
  Crown,
  Flame,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import { RadarWalkthroughModal } from './RadarWalkthroughModal';

interface RadarViewProps {
  profile: MasterProfile;
  cards?: DigitalCard[];
  activeCard: DigitalCard;
  onSelectCard?: (card: DigitalCard) => void;
  allPersonas?: MasterProfile[];
  onSelectPersona?: (id: string) => void;
  onAddContactToCRM: (contact: CRMContact) => void;
  subscription?: SubscriptionState;
  onUpdateSubscription?: (updated: SubscriptionState) => void;
  onOpenSubscriptionModal?: (reason?: string) => void;
}

interface IncomingExchangeRequest {
  requestId: string;
  fromPeerId: string;
  fromSocketId: string;
  fromCard: any;
  fromProfile: any;
  senderPeer?: any;
}

export const RadarView: React.FC<RadarViewProps> = ({
  profile,
  cards = [],
  activeCard,
  onSelectCard,
  allPersonas = [],
  onSelectPersona,
  onAddContactToCRM,
  subscription,
  onUpdateSubscription,
  onOpenSubscriptionModal,
}) => {
  const isBasicTier = subscription?.tier === 'basic';
  const weeklyRadarLimitReached =
    isBasicTier && (subscription?.weeklyRadarSessionsUsed || 0) >= 1;
  const [isBroadcastCardDropdownOpen, setIsBroadcastCardDropdownOpen] = useState(false);

  const availableCards = cards.length > 0 ? cards : [activeCard];

  const getMatchingPersonaForCard = (card: DigitalCard): MasterProfile => {
    const cardPersonaMap: Record<string, string> = {
      'card-executive': 'persona-founder',
      'card-family': 'persona-family',
      'card-golf': 'persona-golf',
      'card-soccer': 'persona-soccer',
    };
    const mappedId = cardPersonaMap[card.id];
    if (mappedId) {
      const found = allPersonas.find((p) => p.id === mappedId);
      if (found) return found;
    }
    return (
      allPersonas.find(
        (p) => p.id === card.id || p.circleName === card.name || p.profileTitle === card.name
      ) || profile
    );
  };

  // Real WebSocket State
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [wsLatency, setWsLatency] = useState<number | null>(null);
  const [realLivePeers, setRealLivePeers] = useState<PeerNode[]>([]);
  // Interactive Walkthrough Guide (opens automatically on first visit, or manually via button)
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return !localStorage.getItem('yc_radar_guide_completed');
      } catch {
        return false;
      }
    }
    return false;
  });
  const [conferenceRoom, setConferenceRoom] = useState<string>('tech_summit');

  // Rooms Infrastructure
  const [roomsList, setRoomsList] = useState<RadarRoomPublicInfo[]>([
    {
      id: 'tech_summit',
      name: 'Public Networking Room',
      description: 'Open networking floor. Connect with peers nearby, discover digital cards, and exchange contacts in real time.',
      hasPassword: false,
      maxParticipants: 0,
      durationMinutes: 600,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 3600 * 1000,
      createdBy: 'System',
      currentParticipantsCount: 1,
      isExpired: false,
      isDefault: true,
    },
  ]);
  const [currentRoomInfo, setCurrentRoomInfo] = useState<RadarRoomPublicInfo | null>(null);

  // Create Room Modal State
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createRoomForm, setCreateRoomForm] = useState({
    name: '',
    description: '',
    hasPassword: false,
    password: '',
    maxParticipants: 10,
    durationMinutes: 120, // default 2 hours, max 10h (600 mins)
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Locked Room Password Entry Modal
  const [isJoinPasswordModalOpen, setIsJoinPasswordModalOpen] = useState(false);
  const [targetJoinRoom, setTargetJoinRoom] = useState<RadarRoomPublicInfo | null>(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Host Creator Authentication Keys (Persisted across device restarts, reloads, and phone crashes)
  const [myCreatorKeys, setMyCreatorKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('youconnect_radar_creator_keys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveCreatorKey = (roomId: string, key: string) => {
    setMyCreatorKeys((prev) => {
      const updated = { ...prev, [roomId]: key };
      try {
        localStorage.setItem('youconnect_radar_creator_keys', JSON.stringify(updated));
      } catch (err) {
        console.warn('localStorage save note:', err);
      }
      return updated;
    });
  };

  // Kill / Terminate Room Modal State
  const [isKillModalOpen, setIsKillModalOpen] = useState(false);
  const [roomToKill, setRoomToKill] = useState<RadarRoomPublicInfo | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  // Alerts & Duration Countdown
  const [roomAlert, setRoomAlert] = useState<string | null>(null);
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('10h 00m 00s');

  // Selected Peer & Exchange Handshake
  const [selectedPeer, setSelectedPeer] = useState<PeerNode | null>(null);
  const [exchangeState, setExchangeState] = useState<'idle' | 'handshaking' | 'complete'>('idle');
  const [exchangeSource, setExchangeSource] = useState<ContactSource>('p2p');
  const [includeInCrm, setIncludeInCrm] = useState<boolean>(false);
  const [contactRelationshipType, setContactRelationshipType] = useState<
    'network' | 'customer' | 'friend' | 'club'
  >('network');
  const [crmStatusTag, setCrmStatusTag] = useState<CRMStatus>('qualified');
  const [exchangeSuccessNotice, setExchangeSuccessNotice] = useState<string | null>(null);

  const exchangePrefsRef = useRef({
    includeInCrm,
    contactRelationshipType,
    crmStatusTag,
    exchangeSource,
  });
  useEffect(() => {
    exchangePrefsRef.current = {
      includeInCrm,
      contactRelationshipType,
      crmStatusTag,
      exchangeSource,
    };
  }, [includeInCrm, contactRelationshipType, crmStatusTag, exchangeSource]);

  const buildReceivedContactClassification = (peerName: string, peerCompany: string) => {
    const prefs = exchangePrefsRef.current;
    if (prefs.includeInCrm) {
      const stageMap = {
        new: { dealStage: 'Qualification' as const, label: 'New Lead', accountStatus: 'Prospect' as const },
        contacted: { dealStage: 'Proposal' as const, label: 'Contacted', accountStatus: 'Prospect' as const },
        qualified: { dealStage: 'Negotiation' as const, label: 'Qualified Lead', accountStatus: 'Evaluating' as const },
        converted: { dealStage: 'Closed-Won' as const, label: 'Converted Customer', accountStatus: 'Active Customer' as const },
        lost: { dealStage: 'Closed-Lost' as const, label: 'Closed-Lost', accountStatus: 'Prospect' as const },
      }[prefs.crmStatusTag] || {
        dealStage: 'Negotiation' as const,
        label: 'Qualified Lead',
        accountStatus: 'Evaluating' as const,
      };
      return {
        isBusinessCRM: true,
        category: 'business' as const,
        status: prefs.crmStatusTag,
        dealName: `${peerCompany || peerName} — ${
          prefs.crmStatusTag === 'converted' ? 'Customer Account' : 'CRM Opportunity'
        }`,
        dealStage: stageMap.dealStage,
        accountStatus: stageMap.accountStatus,
        relationshipTag: `CRM · ${stageMap.label}`,
        summaryDestination: `Business CRM (${stageMap.label})`,
      };
    }

    const relMap = {
      network: { category: 'business' as const, tag: 'Network & Peers', label: 'Contacts (Networking)' },
      customer: { category: 'business' as const, tag: 'Customer / Client', label: 'Contacts (Customer)' },
      friend: { category: 'personal' as const, tag: 'New Friend', label: 'Contacts (New Friend)' },
      club: { category: 'club' as const, tag: 'Club & Hobby', label: 'Contacts (Club / Hobby)' },
    }[prefs.contactRelationshipType];

    return {
      isBusinessCRM: false,
      category: relMap.category,
      status: 'new' as CRMStatus,
      dealName: undefined,
      dealStage: undefined,
      accountStatus: undefined,
      relationshipTag: relMap.tag,
      summaryDestination: relMap.label,
    };
  };

  // Incoming Exchange Modal from another live device
  const [incomingExchange, setIncomingExchange] = useState<IncomingExchangeRequest | null>(null);
  const [autoAcceptExchanges, setAutoAcceptExchanges] = useState(false);

  // Track peers automatically exchanged in user-created rooms (Room Creator <-> Every Participant)
  const autoExchangedRoomPeersRef = useRef<Set<string>>(new Set());
  const [autoExchangedPeerIds, setAutoExchangedPeerIds] = useState<Record<string, boolean>>({});

  // Second Device Pairing & Test Modal
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // NFC Scanner State
  const [isNfcListening, setIsNfcListening] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<string>('NFC antenna ready.');
  const [nfcLastScanned, setNfcLastScanned] = useState<CRMContact | null>(null);
  const [nfcScannedCount, setNfcScannedCount] = useState<number>(0);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const nfcStopScanRef = useRef<(() => void) | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingStartRef = useRef<number>(0);
  const pingTimerRef = useRef<any>(null);

  // Initial Fetch & URL room param check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setConferenceRoom(urlRoom);
      }
    }

    apiFetch('/api/p2p-radar/rooms')
      .then((r) => r.json())
      .then((res) => {
        if (res?.rooms && Array.isArray(res.rooms)) {
          setRoomsList(res.rooms);
        }
      })
      .catch((err) => console.warn('Could not fetch radar rooms list:', err));
  }, []);

  // Room Duration Countdown Timer (max 10h)
  useEffect(() => {
    if (!currentRoomInfo?.expiresAt) {
      setRemainingTimeStr('10h 00m 00s');
      return;
    }
    const updateCountdown = () => {
      const now = Date.now();
      const diff = currentRoomInfo.expiresAt - now;
      if (diff <= 0) {
        setRemainingTimeStr('Expired');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setRemainingTimeStr(
          `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
        );
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [currentRoomInfo]);

  // Effective visible peers (real WebSocket live devices only)
  const allPeers: PeerNode[] = realLivePeers;

  // =========================================================================
  // 1. REAL WEBSOCKET CONNECTION LIFECYCLE
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      if (!isMounted) return;
      setWsStatus('connecting');

      const wsUrl = getWebSocketUrl('/api/p2p-radar');

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setWsStatus('connected');

        // Announce presence with active profile & card
        ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: conferenceRoom,
            peer: {
              id: profile.id,
              name: profile.name,
              role: profile.role,
              company: profile.company,
              email: profile.email,
              phone: profile.phone,
              website: profile.website,
              avatarUrl: profile.avatarUrl,
              customTagline: activeCard.customTagline,
              cardData: {
                name: profile.name,
                role: profile.role,
                company: profile.company,
                email: profile.email,
                phone: profile.phone,
                website: profile.website,
                customTagline: activeCard.customTagline,
                category: activeCard.category,
                tag: activeCard.tag,
                theme: activeCard.theme,
                accentColor: activeCard.accentColor,
              },
              fullCard: activeCard,
              fullProfile: profile,
            },
          })
        );

        // Start ping intervals for latency tracking
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingStartRef.current = performance.now();
            ws.send(JSON.stringify({ type: 'PING' }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'PONG') {
            const rtt = Math.round(performance.now() - pingStartRef.current);
            setWsLatency(rtt);
          } else if (data.type === 'ROOM_STATE') {
            // Received initial list of peers active in this room & room metadata
            if (data.roomInfo) {
              setCurrentRoomInfo(data.roomInfo);
            }
            const livePeers: PeerNode[] = (data.peers || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              role: p.role,
              company: p.company,
              avatarUrl: p.avatarUrl,
              distanceMeters: p.distanceMeters || 2.4,
              signalDbm: p.signalDbm || -50,
              protocol: 'websocket',
              cardData: p.cardData || {},
              isRealLivePeer: true,
              socketId: p.socketId,
            }));
            setRealLivePeers(livePeers);
          } else if (data.type === 'ROOM_LIST_UPDATED') {
            if (data.rooms && Array.isArray(data.rooms)) {
              setRoomsList(data.rooms);
              // Update current room info if matched
              const current = data.rooms.find((r: RadarRoomPublicInfo) => r.id === conferenceRoom);
              if (current) setCurrentRoomInfo(current);
            }
          } else if (data.type === 'ROOM_JOIN_ERROR') {
            setJoinError(data.error);
            setRoomAlert(data.error);
            if (data.requiresPassword) {
              const r = roomsList.find((rm) => rm.id === data.roomId);
              if (r) setTargetJoinRoom(r);
              setIsJoinPasswordModalOpen(true);
            }
          } else if (data.type === 'ROOM_EXPIRED') {
            setRoomAlert(data.message);
            setConferenceRoom('tech_summit');
            apiFetch('/api/p2p-radar/rooms')
              .then((r) => r.json())
              .then((res) => res?.rooms && setRoomsList(res.rooms));
          } else if (data.type === 'ROOM_KILLED') {
            setRoomAlert(data.message);
            setConferenceRoom('tech_summit');
            apiFetch('/api/p2p-radar/rooms')
              .then((r) => r.json())
              .then((res) => res?.rooms && setRoomsList(res.rooms));
          } else if (data.type === 'PEER_JOINED') {
            // Another live device entered the room!
            const newPeer: PeerNode = {
              id: data.peer.id,
              name: data.peer.name,
              role: data.peer.role,
              company: data.peer.company,
              avatarUrl: data.peer.avatarUrl,
              distanceMeters: data.peer.distanceMeters || 2.8,
              signalDbm: data.peer.signalDbm || -52,
              protocol: 'websocket',
              cardData: data.peer.cardData || {},
              isRealLivePeer: true,
              socketId: data.peer.socketId,
            };

            setRealLivePeers((prev) => {
              const filtered = prev.filter((p) => p.id !== newPeer.id);
              return [newPeer, ...filtered];
            });
          } else if (data.type === 'PEER_LEFT') {
            setRealLivePeers((prev) => prev.filter((p) => p.id !== data.peerId && p.socketId !== data.socketId));
            if (selectedPeer?.id === data.peerId) {
              setSelectedPeer(null);
            }
          } else if (data.type === 'PEER_UPDATED') {
            setRealLivePeers((prev) =>
              prev.map((p) => (p.id === data.peer.id ? { ...p, ...data.peer, isRealLivePeer: true } : p))
            );
          } else if (data.type === 'INCOMING_EXCHANGE_REQUEST') {
            // Real two-way exchange request received from another live peer!
            if (autoAcceptExchanges) {
              // Auto-accept immediately
              handleAcceptExchange(data);
            } else {
              setIncomingExchange(data);
            }
          } else if (data.type === 'EXCHANGE_SUCCESS') {
            // Two-way exchange completed with selective sharing!
            const senderProfile = data.targetProfile || data.targetPeer || {};
            const senderCard = data.targetCard;
            const { contactData, sharedFieldsList } = extractSelectiveContactData(senderProfile, senderCard, 'p2p');

            const partnerName = contactData.name || 'Live Colleague';
            const partnerRole = contactData.role || 'Executive';
            const partnerCompany = contactData.company || 'Enterprise';
            const classification = buildReceivedContactClassification(partnerName, partnerCompany);

            const newContact: CRMContact = {
              ...contactData,
              id: `c-real-p2p-${Date.now()}`,
              name: partnerName,
              firstName: contactData.firstName || partnerName.split(/\s+/)[0] || '',
              lastName: contactData.lastName || partnerName.split(/\s+/).slice(1).join(' ') || '',
              role: partnerRole,
              company: partnerCompany,
              email: contactData.email || `${partnerName.toLowerCase().replace(/\s+/g, '.')}@network.com`,
              personalEmail: contactData.personalEmail,
              phone: contactData.phone || '+1 (415) 555-0199',
              personalPhone: contactData.personalPhone,
              website: contactData.website || 'https://example.com',
              location: contactData.location || 'Live Conference Room',
              birthday: contactData.birthday,
              rubricaFields: contactData.rubricaFields,
              socials: contactData.socials,
              category: classification.category,
              isBusinessCRM: classification.isBusinessCRM,
              dealName: classification.dealName,
              dealStage: classification.dealStage,
              accountStatus: classification.accountStatus,
              notes: `Real P2P Radar two-way handshake exchange (${classification.relationshipTag}). Tagline: "${senderCard?.customTagline || ''}"`,
              source: exchangePrefsRef.current.exchangeSource || 'p2p',
              status: classification.status,
              tags: ['P2P Selective Share', classification.relationshipTag, partnerCompany, 'Two-Way Verified'],
              avatarUrl: contactData.avatarUrl || data.targetProfile?.avatarUrl,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              selectiveSyncInfo: {
                isSynced: true,
                lastSyncedAt: new Date().toISOString(),
                senderCircle: senderCard?.name || senderProfile.profileTitle || 'P2P Radar Room',
                sharedFieldsList,
                version: 1,
              },
            };

            onAddContactToCRM(newContact);
            setExchangeState('complete');
            setExchangeSuccessNotice(
              `Exchanged card with ${partnerName}! Saved to ${classification.summaryDestination}.`
            );
          } else if (data.type === 'AUTO_HOST_EXCHANGE') {
            // Room Creator (Host) <-> Room Participant automatic card exchange!
            const targetId = data.targetPeerId || data.targetPeer?.id || data.targetProfile?.id || '';
            const dedupeKey = `${data.roomId || conferenceRoom}:${targetId}`;
            if (!targetId || targetId === profile.id || autoExchangedRoomPeersRef.current.has(dedupeKey)) {
              return;
            }
            autoExchangedRoomPeersRef.current.add(dedupeKey);
            setAutoExchangedPeerIds((prev) => ({ ...prev, [dedupeKey]: true }));

            const senderProfile = data.targetProfile || data.targetPeer || {};
            const senderCard = data.targetCard;
            const { contactData, sharedFieldsList } = extractSelectiveContactData(
              senderProfile,
              senderCard,
              'p2p'
            );

            const partnerName = contactData.name || senderProfile.name || 'Room Participant';
            const partnerRole = contactData.role || senderProfile.role || 'Professional';
            const partnerCompany = contactData.company || senderProfile.company || 'Enterprise';
            const classification = buildReceivedContactClassification(partnerName, partnerCompany);

            const isHostRole = data.roleInExchange === 'host';
            const newContact: CRMContact = {
              ...contactData,
              id: `c-host-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: partnerName,
              firstName: contactData.firstName || partnerName.split(/\s+/)[0] || '',
              lastName: contactData.lastName || partnerName.split(/\s+/).slice(1).join(' ') || '',
              role: partnerRole,
              company: partnerCompany,
              email:
                contactData.email ||
                `${partnerName.toLowerCase().replace(/\s+/g, '.')}@network.com`,
              personalEmail: contactData.personalEmail,
              phone: contactData.phone || '+1 (415) 555-0199',
              personalPhone: contactData.personalPhone,
              website: contactData.website || 'https://example.com',
              location: contactData.location || data.roomName || 'P2P Room',
              birthday: contactData.birthday,
              rubricaFields: contactData.rubricaFields,
              socials: contactData.socials,
              category: classification.category,
              isBusinessCRM: classification.isBusinessCRM,
              dealName: classification.dealName,
              dealStage: classification.dealStage,
              accountStatus: classification.accountStatus,
              notes: isHostRole
                ? `Room Creator Auto-Exchange in "${data.roomName || 'P2P Room'}": Automatically shared your card with and received ${partnerName}'s card (${classification.relationshipTag}).`
                : `Room Host Auto-Exchange in "${data.roomName || 'P2P Room'}": Automatically received room creator ${partnerName}'s card and shared yours (${classification.relationshipTag}).`,
              source: 'p2p',
              status: classification.status,
              tags: [
                isHostRole ? 'Room Creator Auto-Exchange' : 'Room Host Card',
                classification.relationshipTag,
                partnerCompany,
              ],
              avatarUrl: contactData.avatarUrl || senderProfile.avatarUrl,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              selectiveSyncInfo: {
                isSynced: true,
                lastSyncedAt: new Date().toISOString(),
                senderCircle: senderCard?.name || data.roomName || 'P2P Room Auto-Exchange',
                sharedFieldsList,
                version: 1,
              },
            };

            onAddContactToCRM(newContact);
            setExchangeSuccessNotice(
              isHostRole
                ? `Room Creator Auto-Exchange: Shared your card with & received ${partnerName}'s card (${classification.summaryDestination}).`
                : `Room Host Auto-Exchange: Automatically exchanged cards with room creator ${partnerName}!`
            );
          } else if (data.type === 'EXCHANGE_DECLINED') {
            setExchangeState('idle');
            alert('The peer declined the card exchange request.');
          }
        } catch (err) {
          console.warn('Radar WebSocket message parsing note:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsStatus('disconnected');
        clearInterval(pingTimerRef.current);
        // Try reconnecting after 3 seconds
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.warn('Radar WebSocket connection note:', err);
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      clearInterval(pingTimerRef.current);
      clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [conferenceRoom, profile, activeCard]);

  // Clean up NFC on unmount
  useEffect(() => {
    return () => {
      if (nfcStopScanRef.current) {
        nfcStopScanRef.current();
      }
    };
  }, []);

  // Generate pairing QR code for the second device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}?tab=radar&room=${conferenceRoom}&peer=guest_${Math.random().toString(36).substring(2, 6)}`;
      QRCode.toDataURL(shareUrl, { width: 280, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.warn('QR code gen note:', err));
    }
  }, [conferenceRoom]);

  // Room Selection Handler (supports passwords & participant capacity checks)
  const handleSelectRoom = (room: RadarRoomPublicInfo) => {
    if (room.id === conferenceRoom) return;

    if (room.isExpired) {
      alert(`The room "${room.name}" has reached its maximum scheduled duration (10h max) and is now closed.`);
      return;
    }

    if (room.maxParticipants > 0 && room.currentParticipantsCount >= room.maxParticipants) {
      alert(`Room "${room.name}" is currently at full capacity (${room.maxParticipants} participants maximum).`);
      return;
    }

    if (room.hasPassword) {
      setTargetJoinRoom(room);
      setJoinPasswordInput('');
      setJoinError(null);
      setIsJoinPasswordModalOpen(true);
      return;
    }

    // Public room without password
    setConferenceRoom(room.id);
    setSelectedPeer(null);
    setExchangeState('idle');
    setRoomAlert(null);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CHANGE_ROOM',
          roomId: room.id,
        })
      );
    }
  };

  // Submit Password to join locked room
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetJoinRoom) return;

    setJoinError(null);
    const targetId = targetJoinRoom.id;
    const pwd = joinPasswordInput;

    setConferenceRoom(targetId);
    setSelectedPeer(null);
    setExchangeState('idle');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'CHANGE_ROOM',
          roomId: targetId,
          password: pwd,
        })
      );
    }
    setIsJoinPasswordModalOpen(false);
    setJoinPasswordInput('');
  };

  // Helper to determine if current profile is host of room
  const isRoomHost = (room: RadarRoomPublicInfo) => {
    return (
      !room.isDefault &&
      (Boolean(room.createdByProfileId && room.createdByProfileId === profile.id) ||
        Boolean(myCreatorKeys[room.id]))
    );
  };

  // Automatic card exchange when the current user is the Room Creator (Host) of the active room
  useEffect(() => {
    if (!currentRoomInfo || !isRoomHost(currentRoomInfo)) return;
    if (allPeers.length === 0) return;

    let newlyExchangedCount = 0;
    const newlyExchangedNames: string[] = [];

    allPeers.forEach((peer) => {
      // Live WebSocket peers are also handled via AUTO_HOST_EXCHANGE, so dedupe by roomId:peerId
      const dedupeKey = `${currentRoomInfo.id}:${peer.id}`;
      if (peer.id === profile.id || autoExchangedRoomPeersRef.current.has(dedupeKey)) {
        return;
      }

      autoExchangedRoomPeersRef.current.add(dedupeKey);
      setAutoExchangedPeerIds((prev) => ({ ...prev, [dedupeKey]: true }));

      const { contactData, sharedFieldsList } = extractSelectiveContactData(
        peer.cardData || { name: peer.name, role: peer.role, company: peer.company },
        undefined,
        'p2p'
      );
      const classification = buildReceivedContactClassification(peer.name, peer.company);

      const newContact: CRMContact = {
        ...contactData,
        id: `c-host-room-${Date.now()}-${peer.id}`,
        name: peer.name,
        firstName: contactData.firstName || peer.name.split(/\s+/)[0] || '',
        lastName: contactData.lastName || peer.name.split(/\s+/).slice(1).join(' ') || '',
        role: peer.role,
        company: peer.company,
        email:
          peer.cardData?.email ||
          `${peer.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        personalEmail: contactData.personalEmail,
        phone: peer.cardData?.phone || '+1 (555) 019-2834',
        personalPhone: contactData.personalPhone,
        website: peer.cardData?.website || 'https://example.com',
        location: contactData.location || currentRoomInfo.name,
        category: classification.category,
        isBusinessCRM: classification.isBusinessCRM,
        dealName: classification.dealName,
        dealStage: classification.dealStage,
        accountStatus: classification.accountStatus,
        notes: `Room Creator Auto-Exchange in "${currentRoomInfo.name}": As room creator, your "${activeCard.name}" card was shared automatically and ${peer.name}'s card was received (${classification.relationshipTag}).`,
        source: 'p2p',
        status: classification.status,
        tags: ['Room Creator Auto-Exchange', classification.relationshipTag, peer.company],
        avatarUrl: peer.avatarUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        selectiveSyncInfo: {
          isSynced: true,
          lastSyncedAt: new Date().toISOString(),
          senderCircle: `${currentRoomInfo.name} (Room Creator Auto-Exchange)`,
          sharedFieldsList: sharedFieldsList.length
            ? sharedFieldsList
            : ['Full Name', 'Organization', 'Role', 'Email', 'Phone'],
          version: 1,
        },
      };

      onAddContactToCRM(newContact);
      newlyExchangedCount++;
      newlyExchangedNames.push(peer.name);
    });

    if (newlyExchangedCount > 0) {
      const classification = buildReceivedContactClassification('Participant', 'Room');
      setExchangeSuccessNotice(
        `Room Creator Auto-Exchange: Automatically shared your "${activeCard.name}" card and received ${newlyExchangedCount} participant card${
          newlyExchangedCount > 1 ? 's' : ''
        } (${newlyExchangedNames.slice(0, 3).join(', ')}${
          newlyExchangedNames.length > 3 ? '...' : ''
        }) → Saved to ${classification.summaryDestination}.`
      );
    }
  }, [currentRoomInfo, allPeers, profile.id, activeCard.name]);

  // Kill / Terminate Room Execution Handler
  const handleConfirmKillRoom = async () => {
    if (!roomToKill) return;
    try {
      setIsKilling(true);
      const creatorKey = myCreatorKeys[roomToKill.id] || '';

      const res = await apiFetch(`/api/p2p-radar/rooms/${roomToKill.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorKey,
          profileId: profile.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to terminate room');
      }

      // Remove from persisted creator keys
      setMyCreatorKeys((prev) => {
        const updated = { ...prev };
        delete updated[roomToKill.id];
        try {
          localStorage.setItem('youconnect_radar_creator_keys', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setIsKillModalOpen(false);
      setRoomAlert(`Room "${roomToKill.name}" has been permanently closed and dissolved.`);

      // Also tell WebSocket to broadcast instant kill
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'KILL_ROOM',
            roomId: roomToKill.id,
            creatorKey,
            profileId: profile.id,
          })
        );
      }

      if (conferenceRoom === roomToKill.id) {
        setConferenceRoom('tech_summit');
      }

      // Re-fetch rooms
      apiFetch('/api/p2p-radar/rooms')
        .then((r) => r.json())
        .then((resp) => resp?.rooms && setRoomsList(resp.rooms));
    } catch (err: any) {
      alert(`Could not terminate room: ${err.message}`);
    } finally {
      setIsKilling(false);
    }
  };

  // Create Room Form Submit Handler
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoomForm.name.trim()) return;

    if (
      isBasicTier &&
      (createRoomForm.maxParticipants === 0 || createRoomForm.maxParticipants > 5)
    ) {
      onOpenSubscriptionModal?.(
        'Basic Tier allows creating P2P Radar rooms for no more than 5 connected persons. Upgrade to Pro ($12/mo) or Business ($29/mo) for unlimited room participants.'
      );
      return;
    }

    try {
      setIsCreatingRoom(true);
      setJoinError(null);

      const effectiveMaxParticipants = isBasicTier
        ? Math.min(5, createRoomForm.maxParticipants || 5)
        : createRoomForm.maxParticipants;

      const res = await apiFetch('/api/p2p-radar/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createRoomForm.name.trim(),
          description: createRoomForm.description.trim(),
          hasPassword: createRoomForm.hasPassword,
          password: createRoomForm.password,
          maxParticipants: effectiveMaxParticipants,
          durationMinutes: createRoomForm.durationMinutes,
          createdBy: profile.name || 'Anonymous',
          createdByProfileId: profile.id,
          hostCard: activeCard,
          hostProfile: profile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      // Persist creator authentication key in localStorage so the host can kill the room even after crash or phone reboot!
      if (data.creatorKey && data.room?.id) {
        saveCreatorKey(data.room.id, data.creatorKey);
      }

      setIsCreateRoomModalOpen(false);

      // Join the newly created room
      if (data.room) {
        setCurrentRoomInfo(data.room);
      }
      setConferenceRoom(data.room.id);
      setSelectedPeer(null);
      setExchangeState('idle');

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'CHANGE_ROOM',
            roomId: data.room.id,
            password: createRoomForm.hasPassword ? createRoomForm.password : undefined,
            peer: {
              fullCard: activeCard,
              fullProfile: profile,
            },
          })
        );
      }

      // Reset form
      setCreateRoomForm({
        name: '',
        description: '',
        hasPassword: false,
        password: '',
        maxParticipants: 10,
        durationMinutes: 120,
      });
    } catch (err: any) {
      alert(`Could not create room: ${err.message}`);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // =========================================================================
  // 2. CARD EXCHANGE LOGIC (REAL WEBSOCKET TWO-WAY HANDSHAKE)
  // =========================================================================

  // Initiate Card Exchange
  const handleExchangeCard = (peer: PeerNode) => {
    setExchangeState('handshaking');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Real WebSocket Two-Way Handshake Request!
      socketRef.current.send(
        JSON.stringify({
          type: 'EXCHANGE_REQUEST',
          targetPeerId: peer.socketId || peer.id,
          fromCard: activeCard,
          fromProfile: {
            ...profile,
            customTagline: activeCard.customTagline,
          },
          requestId: `req_${Date.now()}`,
        })
      );
    } else {
      setExchangeState('idle');
      setRoomAlert('WebSocket is reconnecting. Please check connection and try again.');
    }
  };

  // Accept incoming exchange request from another live peer
  const handleAcceptExchange = (req: IncomingExchangeRequest) => {
    // 1. Add sender to our Rubrica/CRM with selective sharing extraction
    const senderProfile = req.fromProfile || {};
    const senderCard = req.fromCard;
    const { contactData, sharedFieldsList } = extractSelectiveContactData(senderProfile, senderCard, 'p2p');

    const partnerName = contactData.name || 'Live Colleague';
    const partnerRole = contactData.role || 'Professional';
    const partnerCompany = contactData.company || 'Enterprise';
    const classification = buildReceivedContactClassification(partnerName, partnerCompany);

    const newContact: CRMContact = {
      ...contactData,
      id: `c-incoming-p2p-${Date.now()}`,
      name: partnerName,
      firstName: contactData.firstName || partnerName.split(/\s+/)[0] || '',
      lastName: contactData.lastName || partnerName.split(/\s+/).slice(1).join(' ') || '',
      role: partnerRole,
      company: partnerCompany,
      email: contactData.email || `${partnerName.toLowerCase().replace(/\s+/g, '.')}@network.com`,
      personalEmail: contactData.personalEmail,
      phone: contactData.phone || '+1 (415) 555-0199',
      personalPhone: contactData.personalPhone,
      website: contactData.website || 'https://example.com',
      location: contactData.location || 'Conference Room',
      birthday: contactData.birthday,
      rubricaFields: contactData.rubricaFields,
      socials: contactData.socials,
      category: classification.category,
      isBusinessCRM: classification.isBusinessCRM,
      dealName: classification.dealName,
      dealStage: classification.dealStage,
      accountStatus: classification.accountStatus,
      notes: `Accepted incoming P2P card exchange over live WebSocket (${classification.relationshipTag}). Tagline: "${senderCard?.customTagline || ''}"`,
      source: 'p2p',
      status: classification.status,
      tags: ['P2P Live WebSocket', classification.relationshipTag, partnerCompany, 'Two-Way Verified'],
      avatarUrl: contactData.avatarUrl || req.fromProfile?.avatarUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle: senderCard?.name || senderProfile.profileTitle || 'P2P Radar Room',
        sharedFieldsList,
        version: 1,
      },
    };

    onAddContactToCRM(newContact);

    // 2. Send our card back via WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'EXCHANGE_RESPONSE',
          targetPeerId: req.fromPeerId,
          accepted: true,
          fromCard: activeCard,
          fromProfile: {
            ...profile,
            customTagline: activeCard.customTagline,
          },
          targetCard: req.fromCard,
          targetProfile: req.fromProfile,
          requestId: req.requestId,
        })
      );
    }

    setIncomingExchange(null);
    setExchangeSuccessNotice(
      `Accepted card exchange from ${partnerName}! Saved to ${classification.summaryDestination}.`
    );
  };

  // Decline incoming exchange request
  const handleDeclineExchange = (req: IncomingExchangeRequest) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'EXCHANGE_RESPONSE',
          targetPeerId: req.fromPeerId,
          accepted: false,
          requestId: req.requestId,
        })
      );
    }
    setIncomingExchange(null);
  };

  // =========================================================================
  // 3. PHYSICAL NFC SCANNER
  // =========================================================================
  const handleProcessScannedNfc = (result: NfcReadResult) => {
    const contactName =
      result.contact?.name ||
      (result.url ? `Lead from ${result.url.replace(/^https?:\/\//, '').split('/')[0]}` : 'NFC Contact');
    const contactRole = result.contact?.role || 'Executive';
    const contactCompany = result.contact?.company || 'Incoming NFC Lead';
    const contactEmail = result.contact?.email || '';
    const contactPhone = result.contact?.phone || '';
    const contactWebsite = result.contact?.website || result.url || '';
    const contactNotes =
      result.contact?.notes ||
      `Scanned via RadarView Web NFC Scanner (Tag UID: ${result.serialNumber || 'N/A'}). Auto-captured into CRM.`;

    const newContact: CRMContact = {
      id: `c-nfc-${Date.now()}`,
      name: contactName,
      role: contactRole,
      company: contactCompany,
      email: contactEmail,
      phone: contactPhone,
      website: contactWebsite,
      notes: contactNotes,
      source: 'nfc',
      status: 'new',
      category: 'personal',
      isBusinessCRM: false,
      tags: ['NFC Tag', 'Radar Scanner', 'Auto-Captured'],
      avatarUrl:
        result.contact?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      selectiveSyncInfo: {
        isSynced: true,
        lastSyncedAt: new Date().toISOString(),
        senderCircle: 'NFC Hardware Tap',
        sharedFieldsList: ['Full Name', 'Organization', 'Role', 'Email', 'Phone'],
        version: 1,
      },
    };

    onAddContactToCRM(newContact);
    setNfcLastScanned(newContact);
    setNfcScannedCount((prev) => prev + 1);
    setNfcScanStatus(`✓ Scanned & Added to Rubrica: ${newContact.name} (${newContact.company})`);

    const nfcPeer: PeerNode = {
      id: newContact.id,
      name: newContact.name,
      role: newContact.role,
      company: newContact.company,
      avatarUrl: newContact.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      distanceMeters: 0.4,
      signalDbm: -22,
      protocol: 'bluetooth',
      cardData: {
        name: newContact.name,
        role: newContact.role,
        company: newContact.company,
        email: newContact.email,
        phone: newContact.phone,
        website: newContact.website,
        customTagline: 'Physical NFC Card Tap (Auto-Saved to CRM)',
      },
    };

    setRealLivePeers((prev) => [nfcPeer, ...prev]);
    setSelectedPeer(nfcPeer);
    setExchangeState('complete');
  };

  const handleToggleNfcScanner = async () => {
    if (isNfcListening) {
      if (nfcStopScanRef.current) {
        nfcStopScanRef.current();
        nfcStopScanRef.current = null;
      }
      setIsNfcListening(false);
      setNfcScanStatus('NFC scanner paused.');
      return;
    }

    setIsNfcListening(true);
    setNfcError(null);
    setNfcScanStatus(
      isWebNfcSupported()
        ? 'NFC Antenna Active: Hold incoming NFC card against device to auto-save to CRM...'
        : 'NFC Scanner Active: Ready for hardware tap or NFC emulation...'
    );

    const stopFn = await startNfcReader(
      (result) => {
        handleProcessScannedNfc(result);
      },
      (err) => {
        setIsNfcListening(false);
        setNfcError(err);
        setNfcScanStatus(`Scan Error: ${err}`);
      },
      (status) => {
        setNfcScanStatus(status);
      }
    );

    nfcStopScanRef.current = stopFn;
  };

  // Open 2nd window test peer
  const handleOpenSecondWindowTest = () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=radar&room=${conferenceRoom}&peer=guest_${Math.random().toString(36).substring(2, 6)}`;
    window.open(url, '_blank', 'width=900,height=800');
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?tab=radar&room=${conferenceRoom}`;
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Radar Screen Coordinates for Nodes
  const getPeerRadarCoords = (index: number, total: number, distanceMeters: number) => {
    const angle = (index * (360 / Math.max(total, 1)) + 35) * (Math.PI / 180);
    const normalizedRadius = Math.min(42, Math.max(12, (distanceMeters / 25) * 42));
    const x = 50 + normalizedRadius * Math.cos(angle);
    const y = 50 + normalizedRadius * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] px-3 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8 space-y-6">
      {/* =========================================================================
          1. PUBLIC SCOPE HERO & "HOW IT WORKS" EXPLAINER
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/95 via-slate-950 to-indigo-950/30 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Clear Public Value Proposition */}
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                <span>Live Room & Event Card Exchange</span>
              </span>

              {/* Live WebSocket Status Pill */}
              {wsStatus === 'connected' ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-0.5 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Connected</span>
                  {wsLatency !== null && (
                    <span className="text-[10px] text-emerald-400/80">({wsLatency}ms)</span>
                  )}
                </span>
              ) : wsStatus === 'connecting' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
                  <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                  <span>Connecting...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2.5 py-0.5 rounded-full">
                  <AlertCircle className="h-3 w-3 text-rose-400" />
                  <span>Reconnecting</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Exchange Digital Business Cards with Everyone in the Room
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Join a shared conference room, VIP lounge, or private meeting space to see who is nearby and swap digital business cards in one click—across phones, laptops, or NFC tags.
            </p>
          </div>

          {/* Right: "Your Broadcast Identity" Interactive Card Selector Pill */}
          <div className="relative rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 flex items-center justify-between gap-4 shrink-0 z-30">
            <button
              type="button"
              onClick={() => setIsBroadcastCardDropdownOpen((prev) => !prev)}
              className="flex items-center justify-between gap-3 min-w-0 flex-1 text-left group rounded-xl px-2 py-1.5 -m-1 hover:bg-slate-900/80 transition focus:outline-none"
              title="Click to select which Digital Business Card to broadcast and share in P2P Radar"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-11 w-11 rounded-xl object-cover border border-indigo-500/50 group-hover:border-cyan-400 transition"
                  />
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                    Broadcasting Card
                  </div>
                  <div className="text-xs font-bold text-white truncate">{profile.name}</div>
                  <div className="text-[11px] text-slate-400 group-hover:text-slate-200 truncate flex items-center gap-1.5 transition">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: activeCard.accentColor || '#6366f1' }}
                    />
                    <span className="truncate">
                      {activeCard.name}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 group-hover:text-cyan-300 shrink-0 transition-transform duration-200 ${
                  isBroadcastCardDropdownOpen ? 'rotate-180 text-cyan-300' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu for Selecting Broadcast Card */}
            {isBroadcastCardDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsBroadcastCardDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 sm:left-auto sm:w-80 top-full mt-2 rounded-2xl border border-slate-700 bg-slate-950/98 backdrop-blur-xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                      Select Broadcasting Card
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {availableCards.length} {availableCards.length === 1 ? 'Card' : 'Cards'}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pt-1">
                    {availableCards.map((c, idx) => {
                      const isActive = c.id === activeCard.id;
                      const isLockedByBasicTier = isBasicTier && idx >= 2;
                      const matchingPersona = getMatchingPersonaForCard(c);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            if (isLockedByBasicTier) {
                              setIsBroadcastCardDropdownOpen(false);
                              onOpenSubscriptionModal?.(
                                'Basic Tier allows up to 2 Digital Business Cards maximum. Upgrade to Pro ($12/mo) or Business ($29/mo) to unlock all cards for P2P broadcasting.'
                              );
                              return;
                            }
                            onSelectCard?.(c);
                            if (matchingPersona && onSelectPersona) {
                              onSelectPersona(matchingPersona.id);
                            }
                            setIsBroadcastCardDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left text-xs transition ${
                            isActive
                              ? 'bg-indigo-600/90 text-white font-semibold shadow-sm'
                              : isLockedByBasicTier
                              ? 'text-slate-500 bg-slate-900/40 hover:bg-slate-900'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={matchingPersona.avatarUrl || profile.avatarUrl}
                                alt={c.name}
                                className={`h-8 w-8 rounded-lg object-cover border border-white/20 ${
                                  isLockedByBasicTier ? 'opacity-40 grayscale' : ''
                                }`}
                              />
                              <span
                                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950"
                                style={{ backgroundColor: c.accentColor || '#6366f1' }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate flex items-center gap-1.5">
                                <span className="truncate">{c.name}</span>
                                {isLockedByBasicTier && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] text-amber-300 shrink-0">
                                    <Lock className="h-2.5 w-2.5" /> Pro+
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isActive ? 'text-indigo-100 font-normal' : 'text-slate-400'
                                }`}
                              >
                                {matchingPersona.role || c.customTagline || `#${c.tag || 'Card'}`}
                              </div>
                            </div>
                          </div>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-mono text-white shrink-0">
                              <Check className="h-3 w-3" /> Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Auto-Accept Toggle */}
            <div
              onClick={() => setAutoAcceptExchanges(!autoAcceptExchanges)}
              className="flex flex-col items-end gap-1 pl-3 border-l border-slate-800 cursor-pointer select-none"
              title="Automatically accept incoming card exchanges and reply with your active card"
            >
              <span className="text-[10px] font-semibold text-slate-300 whitespace-nowrap">
                Auto-Accept
              </span>
              <button
                type="button"
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoAcceptExchanges ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    autoAcceptExchanges ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          UNIFIED ROOM & COMMAND DOCK (Compact & Mobile-Balanced)
         ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5 sm:p-4 backdrop-blur-md space-y-3 shadow-lg">
        {/* Top Row: Room Selector Header + Uniform 2x2 Mobile Action Grid */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <DoorOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                    Active Networking Room
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Everyone inside the same room appears on your radar and directory below.
                </p>
              </div>
            </div>
          </div>

          {/* Uniform Action Toolbar: 2x2 Grid on Mobile, Inline Row on Desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setJoinError(null);
                if (
                  isBasicTier &&
                  (createRoomForm.maxParticipants === 0 || createRoomForm.maxParticipants > 5)
                ) {
                  setCreateRoomForm((prev) => ({ ...prev, maxParticipants: 5 }));
                }
                setIsCreateRoomModalOpen(true);
              }}
              className="h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Create Room</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPairModalOpen(true)}
              className="h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-200 text-xs font-semibold transition whitespace-nowrap"
              title="Show Room QR code or open a 2nd browser window to test live P2P discovery"
            >
              <QrIcon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Room QR</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition whitespace-nowrap"
              title="Copy direct invite link to this room"
            >
              {copySuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              )}
              <span className="truncate">{copySuccess ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleNfcScanner}
              className={`h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition border whitespace-nowrap ${
                isNfcListening
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Listen for physical NFC business card taps"
            >
              <ScanLine
                className={`h-3.5 w-3.5 shrink-0 ${
                  isNfcListening ? 'animate-pulse text-emerald-400' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{isNfcListening ? 'NFC Active' : 'NFC Reader'}</span>
            </button>

            {currentRoomInfo && isRoomHost(currentRoomInfo) && (
              <button
                type="button"
                onClick={() => {
                  setRoomToKill(currentRoomInfo);
                  setIsKillModalOpen(true);
                }}
                className="col-span-2 sm:col-span-1 h-9 px-3 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-800/80 bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 text-xs font-bold transition whitespace-nowrap"
                title="Permanently close and dissolve this room"
              >
                <Flame className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Close Room</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Room Selector Buttons (Full-width accessible grid on mobile, wrap on desktop) */}
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
          {roomsList.map((room) => {
            const isSelected = room.id === conferenceRoom;
            const isFull =
              room.maxParticipants > 0 && room.currentParticipantsCount >= room.maxParticipants;

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room)}
                className={`h-9 w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:text-white'
                } ${isFull && !isSelected ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {room.hasPassword ? (
                    <Lock className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-amber-300' : 'text-amber-400'}`} />
                  ) : (
                    <DoorOpen className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-cyan-200' : 'text-slate-400'}`} />
                  )}
                  <span className="truncate">{room.name}</span>

                  {isRoomHost(room) && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
                      <Crown className="h-2.5 w-2.5 text-amber-400" />
                      <span>Host</span>
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                    isSelected
                      ? 'bg-indigo-950/80 text-indigo-200'
                      : isFull
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isFull
                    ? 'Full (' + room.currentParticipantsCount + ')'
                    : room.currentParticipantsCount +
                      (room.maxParticipants ? '/' + room.maxParticipants : '')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Compact Status & Plan Footer Bar inside Command Dock */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
          {currentRoomInfo ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-200">{currentRoomInfo.name}:</span>
              {currentRoomInfo.hasPassword ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                  <Lock className="h-2.5 w-2.5" /> Password Protected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                  <Unlock className="h-2.5 w-2.5" /> Open Room
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                <Users className="h-2.5 w-2.5 text-indigo-400" />
                {currentRoomInfo.maxParticipants > 0
                  ? `${currentRoomInfo.currentParticipantsCount}/${currentRoomInfo.maxParticipants} capacity`
                  : 'Unlimited capacity'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                <Clock className="h-2.5 w-2.5 text-emerald-400" /> {remainingTimeStr}
              </span>
              {!currentRoomInfo.isDefault && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded">
                  <Crown className="h-2.5 w-2.5 text-amber-400" />
                  <span>
                    {isRoomHost(currentRoomInfo)
                      ? 'You are Room Creator: Auto-sharing & receiving cards with all participants'
                      : `Host (${currentRoomInfo.createdBy}) auto-exchanges cards with everyone · Participant swaps are manual`}
                  </span>
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Plan Allowance Summary */}
          {subscription && (
            <div className="flex items-center gap-2">
              <span>
                Plan ({subscription.tier.toUpperCase()}):{' '}
                {isBasicTier ? (
                  <strong className="text-amber-300 font-mono">
                    {subscription.weeklyRadarSessionsUsed || 0}/1 weekly session · 5 max/room
                  </strong>
                ) : (
                  <strong className="text-emerald-300">Unlimited Radar & Capacity</strong>
                )}
              </span>
              {isBasicTier && !weeklyRadarLimitReached && onUpdateSubscription && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSubscription({
                      ...subscription,
                      weeklyRadarSessionsUsed: (subscription.weeklyRadarSessionsUsed || 0) + 1,
                    })
                  }
                  className="rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 transition"
                >
                  Simulate Limit
                </button>
              )}
              {isBasicTier && (
                <button
                  type="button"
                  onClick={() =>
                    onOpenSubscriptionModal?.(
                      'Upgrade to Pro ($12/mo) or Business ($29/mo) for Unlimited P2P Radar sessions and Unlimited room participants.'
                    )
                  }
                  className="rounded bg-cyan-600 hover:bg-cyan-500 px-2.5 py-0.5 text-[10px] font-bold text-white transition"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Basic Tier Radar Session Exhausted Gate */}
      {weeklyRadarLimitReached && (
        <div className="rounded-2xl border border-amber-500/40 bg-slate-900/95 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h3 className="text-base font-bold text-white">
              Weekly Basic P2P Radar Session Limit Reached (1 / 1 Used This Week)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The <strong>Basic Tier</strong> includes <strong>1 P2P Radar session per week</strong> and room creation for up to <strong>5 connected persons</strong>. Upgrade to <strong>Pro ($12/mo)</strong> or <strong>Business ($29/mo)</strong> for unlimited P2P Radar sessions and unlimited room participants.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onOpenSubscriptionModal?.(
                  'Basic Tier includes 1 P2P Radar session per week. Upgrade to Pro or Business for Unlimited P2P Radar discovery and Unlimited room participants.'
                )
              }
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 px-5 py-2.5 text-xs font-bold text-white shadow-lg"
            >
              Upgrade to Pro or Business
            </button>
            {onUpdateSubscription && subscription && (
              <button
                type="button"
                onClick={() =>
                  onUpdateSubscription({
                    ...subscription,
                    weeklyRadarSessionsUsed: 0,
                  })
                }
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300"
              >
                Reset Weekly Counter (Demo)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Alerts & Notices */}
      {roomAlert && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-medium">{roomAlert}</span>
          </div>
          <button onClick={() => setRoomAlert(null)} className="text-amber-400 hover:text-white p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {exchangeSuccessNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-200 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{exchangeSuccessNotice}</span>
          </div>
          <button
            onClick={() => setExchangeSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isNfcListening && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-300">
                Web NFC Reader Active — Hold a physical NFC card near your device
              </span>
              <p className="text-[11px] text-slate-300">{nfcScanStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. COHESIVE 2-COLUMN WORKSPACE:
             Left (6 cols): Interactive Proximity Radar Scope
             Right (6 cols): Room Attendees Directory & 1-Click Card Exchange Console
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (6 cols): Interactive Proximity Radar */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-between min-h-[490px]">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

          {/* Top Bar inside Radar Scope */}
          <div className="relative z-10 w-full flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Interactive Room Radar</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                  {realLivePeers.length} Active {realLivePeers.length === 1 ? 'Peer' : 'Peers'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tap any avatar on the radar to preview their card and swap details.
              </p>
            </div>

            {/* Guide & Verification Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 hover:bg-indigo-900/60 text-indigo-300 hover:text-white text-[11px] font-semibold transition shadow-sm"
                title="Open interactive walkthrough guide"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>How it Works</span>
              </button>
            </div>
          </div>

          {/* The Circular Radar Container */}
          <div className="relative my-4 h-[330px] w-[330px] sm:h-[360px] sm:w-[360px] rounded-full border border-slate-800/80 bg-slate-900/60 shadow-inner flex items-center justify-center">
            <div className="absolute h-full w-full rounded-full border border-slate-800/60 pointer-events-none" />
            <div className="absolute h-[75%] w-[75%] rounded-full border border-slate-800/50 pointer-events-none" />
            <div className="absolute h-[50%] w-[50%] rounded-full border border-slate-800/40 pointer-events-none" />
            <div className="absolute h-[25%] w-[25%] rounded-full border border-slate-800/30 pointer-events-none" />

            <div className="absolute h-full w-[1px] bg-slate-800/60 pointer-events-none" />
            <div className="absolute h-[1px] w-full bg-slate-800/60 pointer-events-none" />

            <span className="absolute top-2 text-[10px] font-mono text-slate-500">25m</span>
            <span className="absolute top-[13%] text-[10px] font-mono text-slate-500">18m</span>
            <span className="absolute top-[26%] text-[10px] font-mono text-slate-500">10m</span>
            <span className="absolute top-[38%] text-[10px] font-mono text-slate-500">3m</span>

            {/* Animated Rotating Sweep */}
            <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none">
              <div className="h-1/2 w-1/2 origin-bottom-right bg-gradient-to-br from-indigo-500/25 via-indigo-500/5 to-transparent rounded-tl-full" />
            </div>

            {/* CENTER NODE: The User ("You") */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="relative h-11 w-11 rounded-full border-2 border-indigo-400 bg-indigo-600 p-0.5 shadow-lg shadow-indigo-500/50 flex items-center justify-center">
                {isNfcListening && (
                  <span className="absolute -inset-2.5 rounded-full border-2 border-emerald-400/70 animate-ping pointer-events-none" />
                )}
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="text-[10px] font-bold text-white mt-1 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800">
                You
              </span>
            </div>

            {/* PEER NODES ON RADAR */}
            {allPeers.map((peer, idx) => {
              const { x, y } = getPeerRadarCoords(idx, allPeers.length, peer.distanceMeters);
              const isSelected = selectedPeer?.id === peer.id;

              return (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => {
                    setSelectedPeer(peer);
                    setExchangeState('idle');
                  }}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300 ${
                    isSelected ? 'scale-125' : 'hover:scale-115'
                  }`}
                  title={`${peer.name} (${peer.distanceMeters.toFixed(1)}m away)`}
                >
                  <div className="relative">
                    <span className="absolute -inset-1.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />

                    <div
                      className={`relative h-9 w-9 rounded-full border-2 p-0.5 shadow-md ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950 shadow-cyan-500/50 ring-2 ring-cyan-400/50'
                          : 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950 group-hover:border-cyan-400'
                      }`}
                    >
                      <img
                        src={peer.avatarUrl}
                        alt={peer.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>

                    <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-black ring-1 ring-slate-950 shadow">
                      <Zap className="h-2 w-2 text-black fill-black" />
                    </span>
                  </div>

                  <div className="absolute left-1/2 -translate-x-1/2 top-10 hidden group-hover:block whitespace-nowrap z-30 rounded-lg bg-slate-900/95 border border-slate-700 p-2 text-[10px] text-white shadow-xl pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{peer.name}</span>
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        LIVE DEVICE
                      </span>
                    </div>
                    <div className="text-slate-400 text-[9px] mt-0.5">
                      {peer.distanceMeters.toFixed(1)}m · {peer.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Radar Legend Footer */}
          <div className="relative z-10 w-full flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Live Connected Device</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <span>Simulated Attendee</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPairModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <QrIcon className="h-3 w-3" />
              <span>Connect Phone / 2nd Tab →</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (6 cols): People Directory & 1-Click Card Exchange Console */}
        <div className="lg:col-span-6 space-y-4">
          {/* Selected Person Exchange Card */}
          {selectedPeer && (
            <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 p-5 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={selectedPeer.avatarUrl}
                      alt={selectedPeer.name}
                      className="h-14 w-14 rounded-xl border border-slate-700 object-cover"
                    />
                    {selectedPeer.isRealLivePeer && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-black shadow ring-1 ring-slate-950">
                        <Zap className="h-2.5 w-2.5 fill-black" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {selectedPeer.name}
                      </h3>
                      {selectedPeer.isRealLivePeer ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          LIVE DEVICE
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          DEMO ATTENDEE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-400 font-medium">{selectedPeer.role}</p>
                    <p className="text-xs text-slate-400">{selectedPeer.company}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-semibold text-cyan-400 tabular-nums">
                    {selectedPeer.distanceMeters.toFixed(1)}m away
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPeer(null)}
                    className="text-[10px] text-slate-400 hover:text-white mt-1"
                  >
                    Close
                  </button>
                </div>
              </div>

              {selectedPeer.cardData?.customTagline && (
                <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5 text-xs text-slate-300 italic">
                  "{selectedPeer.cardData.customTagline}"
                </div>
              )}

              {/* Card to Share & CRM Tagging before Exchange */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                    Your Card to Share in This Exchange
                  </label>
                  <select
                    value={activeCard.id}
                    onChange={(e) => {
                      const chosenIdx = availableCards.findIndex((c) => c.id === e.target.value);
                      const chosen = availableCards[chosenIdx];
                      if (!chosen) return;
                      if (isBasicTier && chosenIdx >= 2) {
                        onOpenSubscriptionModal?.(
                          'Basic Tier allows up to 2 Digital Business Cards maximum. Upgrade to Pro ($12/mo) or Business ($29/mo) to unlock all cards.'
                        );
                        return;
                      }
                      onSelectCard?.(chosen);
                      const matchingPersona = getMatchingPersonaForCard(chosen);
                      if (matchingPersona && onSelectPersona) {
                        onSelectPersona(matchingPersona.id);
                      }
                    }}
                    className="w-full rounded-lg border border-indigo-500/40 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white focus:border-cyan-400 focus:outline-none"
                  >
                    {availableCards.map((c, idx) => {
                      const locked = isBasicTier && idx >= 2;
                      const matchingPersona = getMatchingPersonaForCard(c);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} — {matchingPersona.role || c.tag || 'Card'}
                          {locked ? ' (Pro+ Locked)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Destination Toggle: General Contacts Only vs. Business CRM Pipeline */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Is Received Card for Business CRM?
                    </label>
                    <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setIncludeInCrm(false)}
                        className={`px-2.5 py-1 rounded-md transition ${
                          !includeInCrm
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        No · Contacts Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncludeInCrm(true)}
                        className={`px-2.5 py-1 rounded-md transition ${
                          includeInCrm
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Yes · Add to CRM
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Save Source Tag
                      </label>
                      <select
                        value={exchangeSource}
                        onChange={(e) => setExchangeSource(e.target.value as ContactSource)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="p2p">P2P Radar Room</option>
                        <option value="nfc">NFC Tap</option>
                        <option value="qr">Room QR</option>
                        <option value="manual">Direct Exchange</option>
                      </select>
                    </div>

                    {includeInCrm ? (
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                          CRM Follow-Up Stage
                        </label>
                        <select
                          value={crmStatusTag}
                          onChange={(e) => setCrmStatusTag(e.target.value as CRMStatus)}
                          className="w-full rounded-lg border border-indigo-500/40 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="new">New Lead (Qualification)</option>
                          <option value="contacted">Contacted (Proposal)</option>
                          <option value="qualified">Qualified Lead (Negotiation)</option>
                          <option value="converted">Converted Customer</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">
                          Contact Relationship
                        </label>
                        <select
                          value={contactRelationshipType}
                          onChange={(e) =>
                            setContactRelationshipType(
                              e.target.value as 'network' | 'customer' | 'friend' | 'club'
                            )
                          }
                          className="w-full rounded-lg border border-cyan-500/30 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="network">Networking / Peer</option>
                          <option value="customer">Customer / Partner</option>
                          <option value="friend">New Friend / Personal</option>
                          <option value="club">Club / Hobby & Sport</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary 1-Click Exchange Action */}
              <div>
                {exchangeState === 'complete' ? (
                  <div className="rounded-xl bg-emerald-950/50 border border-emerald-700/60 p-3 text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>
                      {includeInCrm
                        ? 'Card Exchanged & Added to Your Business CRM!'
                        : 'Card Exchanged & Saved to Your Contacts!'}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleExchangeCard(selectedPeer)}
                    disabled={exchangeState === 'handshaking'}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition disabled:opacity-50"
                  >
                    <ArrowRightLeft
                      className={`h-4 w-4 ${exchangeState === 'handshaking' ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {exchangeState === 'handshaking'
                        ? selectedPeer.isRealLivePeer
                          ? 'Waiting for Peer to Accept on Their Device...'
                          : 'Exchanging Digital Cards...'
                        : selectedPeer.isRealLivePeer
                        ? `Exchange Cards with ${selectedPeer.name} (Live 2-Way)`
                        : `Exchange Digital Cards with ${selectedPeer.name}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Room People Directory with Direct Action Buttons */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div>
                <span className="text-xs font-bold text-white">
                  People in {currentRoomInfo?.name || 'This Room'}
                </span>
                <p className="text-[10px] text-slate-400">
                  Click a person to preview or exchange your {activeCard.name} card
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-cyan-300">
                {allPeers.length} {allPeers.length === 1 ? 'Person' : 'People'}
              </span>
            </div>

            {allPeers.length > 0 ? (
              <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto pr-1">
                {allPeers.map((peer) => {
                  const isSelected = selectedPeer?.id === peer.id;
                  const dedupeKey = `${currentRoomInfo?.id || conferenceRoom}:${peer.id}`;
                  const isAutoExchangedWithHost = Boolean(autoExchangedPeerIds[dedupeKey]);
                  return (
                    <div
                      key={peer.id}
                      onClick={() => {
                        setSelectedPeer(peer);
                        setExchangeState(isAutoExchangedWithHost ? 'complete' : 'idle');
                      }}
                      className={`flex items-center justify-between gap-3 py-2.5 px-2.5 rounded-xl cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-950/60 border border-indigo-500/40 text-white'
                          : 'hover:bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={peer.avatarUrl}
                            alt={peer.name}
                            className="h-10 w-10 rounded-xl object-cover border border-slate-700"
                          />
                          {peer.isRealLivePeer && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">
                              {peer.name}
                            </span>
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                              LIVE
                            </span>
                            {isAutoExchangedWithHost && (
                              <span className="inline-flex items-center gap-0.5 text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                                <Check className="h-2.5 w-2.5" />
                                <span>Host Auto-Shared</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {peer.role} · {peer.company}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[11px] font-mono text-cyan-400 hidden sm:inline">
                          {peer.distanceMeters.toFixed(1)}m
                        </span>
                        {isAutoExchangedWithHost ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>Exchanged</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPeer(peer);
                              handleExchangeCard(peer);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-[11px] font-semibold transition shadow-sm"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>Swap Card</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="relative mx-auto h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Users className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                  </span>
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <div className="text-xs font-bold text-white">
                    Radar Active — Scanning for Nearby Peers
                  </div>
                  <p className="text-[11px] text-slate-400">
                    No other attendees are currently connected in this room. Share your Room QR or direct invite link so nearby people can join.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPairModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
                  >
                    <QrIcon className="h-3.5 w-3.5" />
                    <span>Room QR / Pair Device</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Interactive Guide</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          INCOMING CARD EXCHANGE REQUEST MODAL (REAL-TIME TWO-WAY P2P)
         ========================================================================= */}
      {incomingExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/60 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 animate-pulse">
                  <ArrowRightLeft className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-white">
                  Incoming P2P Card Exchange
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                Live Peer
              </span>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <img
                src={
                  incomingExchange.fromProfile?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                }
                alt="Sender Avatar"
                className="h-12 w-12 rounded-xl object-cover border border-slate-700"
              />
              <div className="overflow-hidden">
                <div className="font-bold text-white text-sm truncate">
                  {incomingExchange.fromProfile?.name || 'Incoming Colleague'}
                </div>
                <div className="text-xs text-indigo-400 truncate">
                  {incomingExchange.fromProfile?.role || 'Executive'}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {incomingExchange.fromProfile?.company || 'Enterprise'}
                </div>
              </div>
            </div>

            {incomingExchange.fromCard?.customTagline && (
              <p className="text-xs text-slate-300 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                "{incomingExchange.fromCard.customTagline}"
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  Reply & Share Back With Your Card
                </label>
                <select
                  value={activeCard.id}
                  onChange={(e) => {
                    const chosenIdx = availableCards.findIndex((c) => c.id === e.target.value);
                    const chosen = availableCards[chosenIdx];
                    if (!chosen) return;
                    if (isBasicTier && chosenIdx >= 2) {
                      onOpenSubscriptionModal?.(
                        'Basic Tier allows up to 2 Digital Business Cards maximum. Upgrade to Pro ($12/mo) or Business ($29/mo) to unlock all cards.'
                      );
                      return;
                    }
                    onSelectCard?.(chosen);
                    const matchingPersona = getMatchingPersonaForCard(chosen);
                    if (matchingPersona && onSelectPersona) {
                      onSelectPersona(matchingPersona.id);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-cyan-400 focus:outline-none"
                >
                  {availableCards.map((c, idx) => {
                    const locked = isBasicTier && idx >= 2;
                    const matchingPersona = getMatchingPersonaForCard(c);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({matchingPersona.role || c.tag || 'Card'})
                        {locked ? ' — Pro+ Locked' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Choose whether incoming card is for CRM or Contacts Only */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Is Received Card for CRM?
                  </span>
                  <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setIncludeInCrm(false)}
                      className={`px-2 py-1 rounded transition ${
                        !includeInCrm
                          ? 'bg-cyan-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      No · Contacts Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setIncludeInCrm(true)}
                      className={`px-2 py-1 rounded transition ${
                        includeInCrm
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Yes · Add to CRM
                    </button>
                  </div>
                </div>

                {includeInCrm ? (
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                      Select CRM Stage
                    </label>
                    <select
                      value={crmStatusTag}
                      onChange={(e) => setCrmStatusTag(e.target.value as CRMStatus)}
                      className="w-full rounded-lg border border-indigo-500/40 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="new">New Lead (Qualification)</option>
                      <option value="contacted">Contacted (Proposal)</option>
                      <option value="qualified">Qualified Lead (Negotiation)</option>
                      <option value="converted">Converted Customer</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-300 mb-1">
                      Contact Relationship
                    </label>
                    <select
                      value={contactRelationshipType}
                      onChange={(e) =>
                        setContactRelationshipType(
                          e.target.value as 'network' | 'customer' | 'friend' | 'club'
                        )
                      }
                      className="w-full rounded-lg border border-cyan-500/30 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="network">Networking / Peer</option>
                      <option value="customer">Customer / Partner</option>
                      <option value="friend">New Friend / Personal</option>
                      <option value="club">Club / Hobby & Sport</option>
                    </select>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Accepting will save their card to{' '}
                <strong>{includeInCrm ? 'Business CRM' : 'your Contacts'}</strong> and send your selected{' '}
                <strong>{activeCard.name}</strong> card back.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleDeclineExchange(incomingExchange)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleAcceptExchange(incomingExchange)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition"
              >
                <Check className="h-4 w-4" />
                <span>Accept & Share Back</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAIR SECOND DEVICE / TEST LIVE WEBSOCKET MODAL
         ========================================================================= */}
      {isPairModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrIcon className="h-5 w-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Test Live Multi-Device P2P Radar
                </h3>
              </div>
              <button
                onClick={() => setIsPairModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              To verify that the P2P Radar is <strong>100% real and not simulated</strong>, open this exact room on your phone or in a second browser window. You will see both devices appear live on each other's radars!
            </p>

            {/* QR Code */}
            {qrCodeDataUrl ? (
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white max-w-[240px] mx-auto shadow-md">
                <img src={qrCodeDataUrl} alt="Room QR Code" className="h-48 w-48 object-contain" />
                <span className="text-[10px] text-slate-800 font-mono mt-1 font-semibold">Scan with Mobile Camera</span>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                Generating QR code...
              </div>
            )}

            {/* Actions: Open 2nd Tab or Copy Link */}
            <div className="space-y-2">
              <button
                onClick={handleOpenSecondWindowTest}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 py-2.5 text-xs font-bold text-white shadow hover:opacity-95 transition"
              >
                <Laptop className="h-4 w-4" />
                <span>Open Second Window as Test Attendee</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                {copySuccess ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copySuccess ? 'Room Link Copied!' : 'Copy Direct Room Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE SECURE RADAR ROOM MODAL (OPTIONAL PASSWORD, CAPACITY & 10H DURATION)
         ========================================================================= */}
      {isCreateRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <DoorOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create P2P Radar Room</h3>
                  <p className="text-[11px] text-slate-400">
                    Limit discovery and interactions with optional password, capacity, and duration (max 10h).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateRoomModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              {/* Room Creator Auto-Exchange Info Banner */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-start gap-2.5">
                <Crown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">Room Creator Auto-Exchange Enabled</div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    As the creator of this room, you automatically share your active card (<strong>{activeCard.name}</strong>) and receive the card of everyone who joins. Participants in the room can then choose manually whether to share with other participants.
                  </p>
                </div>
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Room Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createRoomForm.name}
                  onChange={(e) => setCreateRoomForm({ ...createRoomForm, name: e.target.value })}
                  placeholder="e.g. Executive Boardroom, Private Investor Lounge, Booth #402"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Room Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Topic / Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={createRoomForm.description}
                  onChange={(e) => setCreateRoomForm({ ...createRoomForm, description: e.target.value })}
                  placeholder="e.g. Confidential M&A discussion or private product showcase"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Password Protection Toggle & Input */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Require Password for Room Access
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Limits radar discovery exclusively to attendees with this password
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCreateRoomForm({
                        ...createRoomForm,
                        hasPassword: !createRoomForm.hasPassword,
                      })
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      createRoomForm.hasPassword ? 'bg-amber-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        createRoomForm.hasPassword ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {createRoomForm.hasPassword && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-200">
                    <label className="block text-[11px] font-medium text-amber-300">
                      Room Access Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        required={createRoomForm.hasPassword}
                        value={createRoomForm.password}
                        onChange={(e) =>
                          setCreateRoomForm({ ...createRoomForm, password: e.target.value })
                        }
                        placeholder="Choose a secure room password..."
                        className="w-full rounded-lg border border-amber-900/60 bg-amber-950/20 px-3 py-2 text-xs text-amber-200 focus:border-amber-500 focus:outline-none pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                      >
                        {showCreatePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Only peers who enter this password will be visible on the radar screen and able to exchange digital cards.
                    </p>
                  </div>
                )}
              </div>

              {/* Participant Capacity Limit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Participant Limit</span>
                  </label>
                  <span className="text-[10px] font-mono text-indigo-300">
                    {createRoomForm.maxParticipants === 0
                      ? 'Unlimited Attendance'
                      : `${createRoomForm.maxParticipants} People Max`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {isBasicTier
                    ? 'Basic Tier allows creating rooms for no more than 5 persons connected. Upgrade to Pro or Business for unlimited room participants.'
                    : 'Caps the number of people that can be discovered and interact inside the room.'}
                </p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { value: 2, label: '2 (1-on-1)' },
                    { value: 5, label: '5 People' },
                    { value: 10, label: '10 People' },
                    { value: 25, label: '25 VIPs' },
                    { value: 50, label: '50 Cap' },
                    { value: 0, label: 'Unlimited' },
                  ].map((opt) => {
                    const isLockedOption =
                      isBasicTier && (opt.value === 0 || opt.value > 5);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          if (isLockedOption) {
                            onOpenSubscriptionModal?.(
                              'Basic Tier allows creating rooms for up to 5 connected persons maximum. Upgrade to Pro ($12/mo) or Business ($29/mo) for unlimited room participants.'
                            );
                            return;
                          }
                          setCreateRoomForm({ ...createRoomForm, maxParticipants: opt.value });
                        }}
                        className={`py-2 px-2 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1 ${
                          createRoomForm.maxParticipants === opt.value
                            ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                            : isLockedOption
                            ? 'border-slate-800/80 bg-slate-950/50 text-slate-500 hover:border-amber-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isLockedOption && <Lock className="h-3 w-3 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room Duration (Max 10 Hours) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Room Duration (Max 10 Hours)</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-300">
                    {createRoomForm.durationMinutes >= 60
                      ? `${createRoomForm.durationMinutes / 60} Hour${createRoomForm.durationMinutes / 60 > 1 ? 's' : ''}`
                      : `${createRoomForm.durationMinutes} Minutes`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  The room automatically closes and safely dissolves after this duration expires (maximum 10 hours).
                </p>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { mins: 30, label: '30m' },
                    { mins: 60, label: '1 Hour' },
                    { mins: 120, label: '2 Hours' },
                    { mins: 240, label: '4 Hours' },
                    { mins: 480, label: '8 Hours' },
                    { mins: 600, label: '10 Hours' },
                  ].map((dur) => (
                    <button
                      key={dur.mins}
                      type="button"
                      onClick={() =>
                        setCreateRoomForm({ ...createRoomForm, durationMinutes: dur.mins })
                      }
                      className={`py-2 px-2 rounded-xl border text-xs font-semibold transition ${
                        createRoomForm.durationMinutes === dur.mins
                          ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <DoorOpen className="h-4 w-4" />
                  <span>{isCreatingRoom ? 'Creating Room...' : 'Create & Enter Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          LOCKED ROOM PASSWORD ENTRY MODAL
         ========================================================================= */}
      {isJoinPasswordModalOpen && targetJoinRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Password Protected</h3>
                  <p className="text-[11px] text-slate-400">{targetJoinRoom.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsJoinPasswordModalOpen(false);
                  setJoinPasswordInput('');
                  setJoinError(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Access to <strong>"{targetJoinRoom.name}"</strong> is restricted. Enter the room password to view nearby peers and interact.
            </p>

            {joinError && (
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Room Password
                </label>
                <div className="relative">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={joinPasswordInput}
                    onChange={(e) => setJoinPasswordInput(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showJoinPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsJoinPasswordModalOpen(false);
                    setJoinPasswordInput('');
                    setJoinError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-md shadow-amber-600/20 transition"
                >
                  <Unlock className="h-4 w-4" />
                  <span>Unlock & Join</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          KILL / DISSOLVE ROOM HOST CONFIRMATION MODAL
         ========================================================================= */}
      {isKillModalOpen && roomToKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-900/60 bg-slate-900 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Kill / Terminate Room</h3>
                  <p className="text-[11px] text-rose-300">Host Immediate Dissolution</p>
                </div>
              </div>
              <button
                onClick={() => setIsKillModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                Are you sure you want to permanently kill and dissolve <strong>"{roomToKill.name}"</strong>?
              </p>
              <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 space-y-2 text-[11px] text-rose-200">
                <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Immediate Termination Effects:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>The room is permanently wiped from the live server.</li>
                  <li>
                    All {roomToKill.currentParticipantsCount} attendee(s) currently connected will be notified and safely transferred back to the main summit floor.
                  </li>
                  <li>No other peers will be able to discover each other or interact in this room.</li>
                </ul>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>
                  Note: Even if your phone crashes, restarts, or loses battery, this room will continue to live safely on the server until its scheduled duration expires or until you return here to kill it.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsKillModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Keep Room Active
              </button>
              <button
                type="button"
                disabled={isKilling}
                onClick={handleConfirmKillRoom}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                <Flame className="h-4 w-4" />
                <span>{isKilling ? 'Killing Room...' : 'Kill & Dissolve Room Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INTERACTIVE WALKTHROUGH GUIDE (AUTO-OPENS ON FIRST VISIT / ON DEMAND)
         ========================================================================= */}
      <RadarWalkthroughModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenRoomQr={() => setIsPairModalOpen(true)}
      />
    </div>
  );
};
