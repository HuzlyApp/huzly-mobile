import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import BottomNav from '@/components/ui/BottomNav';
import { useAuthSession } from '@/hooks/use-auth-session';
import { fetchClientMessagingRecipient } from '@/lib/messages/messages.service';
import {
  countWeekdaysInclusive,
  formatRangeShort,
} from '@/lib/shifts/shift-schedule-dates';
import {
  directionsAvailability,
  directionsGeocodeQueryFromShift,
  estimateShiftPay,
  fetchCompletedShiftRequirementIds,
  fetchShiftById,
  isMultiShift,
  mapsUrlForFacility,
  requirementTypeForShiftReq,
  toNum,
  type ShiftBrowseItem,
  type ShiftRequirementRow,
} from '@/lib/shifts/shifts-browse.service';

const PRIMARY = '#2563EB';
const HEADER_BLUE = '#1E3A5F';
const NAVY = '#0F172A';
const TEXT_PRIMARY = '#1E293B';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const CARD_BORDER_BLUE = '#93C5FD';
const BANNER_BG = '#EFF6FF';
const PAGE_BG = '#F8FAFC';
const GREEN = '#16A34A';
const RED = '#DC2626';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

type TabKey = 'details' | 'instructions' | 'requirements';

function formatShiftDayLine(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

function formatEstTimeMin(m: number | null | undefined): string {
  if (m == null || m <= 0) return '—';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

/** Placeholder until shift times exist in API */
const DEFAULT_SHIFT_HOURS = '8:00 AM - 4:00 PM EST';

const DEFAULT_REQ_BLURB = 'Read a few slides';

function parseTab(raw: string | undefined): TabKey {
  if (raw === 'instructions' || raw === 'requirements') return raw;
  return 'details';
}

export default function ShiftJobDetailsScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { user } = useAuthSession();
  const scrollRef = useRef<ScrollView>(null);
  const detailsY = useRef(0);
  const [tab, setTab] = useState<TabKey>(() => parseTab(tabParam));
  const [shift, setShift] = useState<ShiftBrowseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [jobReqOpen, setJobReqOpen] = useState(true);
  const [clothingOpen, setClothingOpen] = useState(true);
  const [completedReqIds, setCompletedReqIds] = useState<Set<string>>(new Set());
  const [employerChatOpen, setEmployerChatOpen] = useState(false);
  const [employerResolved, setEmployerResolved] = useState<{ user_id: string; company_name: string } | null>(null);

  useEffect(() => {
    setTab(parseTab(tabParam));
  }, [tabParam]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) {
        setError('Missing shift');
        setLoading(false);
        return;
      }
      const { data, error: err } = await fetchShiftById(String(id));
      if (cancelled) return;
      if (err || !data) {
        setError(err ?? 'Not found');
        setShift(null);
      } else {
        setShift(data);
        setError(null);
      }
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setEmployerResolved(null);
    const clientId = shift?.client_id;
    if (!clientId || shift?.employer_contact) return;
    let cancelled = false;
    void (async () => {
      const { data } = await fetchClientMessagingRecipient(String(clientId));
      if (!cancelled && data) setEmployerResolved(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [shift?.client_id, shift?.employer_contact?.user_id]);

  const effectiveEmployer = shift?.employer_contact ?? employerResolved;

  const openEmployerChatIntro = useCallback(() => {
    if (!user) {
      Alert.alert('Sign in', 'Please sign in to message the employer.');
      return;
    }
    setEmployerChatOpen(true);
  }, [user]);

  const confirmEmployerChatAndNavigate = useCallback(() => {
    setEmployerChatOpen(false);
    if (!user) return;
    const ec = effectiveEmployer;
    if (ec) {
      router.push({
        pathname: '/messaging/chat',
        params: { receiver_id: ec.user_id, receiver_name: ec.company_name },
      });
    } else {
      Alert.alert(
        'Employer chat',
        'We could not load messaging for this employer. Open Messages to pick a contact or try again later.',
      );
      router.push('/messaging');
    }
  }, [user, effectiveEmployer, router]);

  const shiftRequirementIds = useMemo(
    () => (shift?.shift_requirements ?? []).map((r) => r.id),
    [shift],
  );

  useEffect(() => {
    if (!user?.id || shiftRequirementIds.length === 0) {
      setCompletedReqIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { ids } = await fetchCompletedShiftRequirementIds(user.id, shiftRequirementIds);
      if (!cancelled) setCompletedReqIds(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, shiftRequirementIds.join(',')]);

  const scrollToDetails = useCallback(() => {
    setTab('details');
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, detailsY.current - 12), animated: true });
    });
  }, []);

  const openDirections = useCallback(
    (s: ShiftBrowseItem) => {
      const block = directionsAvailability(s);
      if (block.kind !== 'ok') {
        const msg =
          block.kind === 'no_facility_id'
            ? 'This shift has no facility_id in the database. In Supabase, set shifts.facility_id to a valid public.facility row (see supabase/seed/fix_facility_locations.sql).'
            : block.kind === 'facility_not_visible'
              ? 'This shift has a facility_id, but the app cannot read public.facility (missing SELECT grant or RLS). In Supabase → SQL Editor, run the file supabase/migrations/20260403121000_facility_select_for_browse.sql, then reload the app.'
              : 'The workplace record has no usable address, coordinates, or name. Update that row in public.facility or run supabase/seed/fix_facility_locations.sql.';
        Alert.alert('Directions', msg);
        return;
      }
      const f = s.facility;
      router.push({
        pathname: '/directions',
        params: {
          destLat: f?.lat != null ? String(f.lat) : '',
          destLng: f?.lng != null ? String(f.lng) : '',
          address: directionsGeocodeQueryFromShift(s),
          label: f?.name?.trim() || s.title?.trim() || 'Job site',
        },
      });
    },
    [router],
  );

  const explainEstPay = useCallback(() => {
    Alert.alert(
      'Estimated pay',
      'This estimate is based on the posted rate and expected hours. Final pay may vary based on actual time worked and job terms.',
    );
  }, []);

  const clothingSections = useMemo(() => {
    /** Schema has no wear/bring table; `facility.required_credentials` is shown as context only. */
    const creds = shift?.facility?.required_credentials;
    const flat = Array.isArray(creds) ? creds.map((c) => String(c).trim()).filter(Boolean) : [];
    return { wear: [] as string[], avoid: [] as string[], credentialHints: flat };
  }, [shift]);

  const reqs = shift?.shift_requirements ?? [];
  const allReqsComplete = reqs.length === 0 || reqs.every((r) => completedReqIds.has(r.id));

  const onCompleteRequirements = useCallback(() => {
    if (!user) {
      Alert.alert('Sign in', 'Please sign in to complete requirements and join the waitlist.');
      return;
    }
    if (!allReqsComplete) {
      Alert.alert('Almost there', 'Complete each job requirement above before joining the waitlist.');
      return;
    }
    Alert.alert(
      'Waitlist',
      'You’re set. We’ll notify you when a slot opens or when the employer updates this job.',
    );
  }, [user, allReqsComplete]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  if (error || !shift) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerIcon}>
            <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerIcon} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.err}>{error ?? 'Unavailable'}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={styles.link}>Go back</Text>
          </Pressable>
        </View>
        <BottomNav active="explore" />
      </SafeAreaView>
    );
  }

  const rate = toNum(shift.rate_per_hour);
  const people = toNum(shift.number_of_people_needed);
  const multi = isMultiShift(shift);
  const workdays = countWeekdaysInclusive(shift.start_date, shift.end_date ?? shift.start_date);
  const totalEst = estimateShiftPay(shift);
  const estPerDay =
    totalEst != null && workdays > 0 ? totalEst / workdays : totalEst != null ? totalEst : null;
  const companyName = shift.facility?.name?.trim() || 'Employer';
  const isFull = people != null && people <= 0;
  const bookDisabled = isFull;

  const miniCard = (
    <View style={styles.miniCard}>
      <View style={styles.miniIcon}>
        <Ionicons name="person" size={22} color="#FFFFFF" />
      </View>
      <View style={styles.miniText}>
        <Text style={styles.miniTitle} numberOfLines={2}>
          {shift.title?.trim() || 'Shift'}
        </Text>
        <Text style={styles.miniSub} numberOfLines={1}>
          {companyName}
        </Text>
      </View>
      <View style={styles.miniRight}>
        {multi ? (
          <View style={styles.multiBadge}>
            <Ionicons name="sync" size={12} color={PRIMARY} />
            <Text style={styles.multiBadgeText}>Multi</Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => setFavorited((f) => !f)}
          hitSlop={8}
          accessibilityLabel={favorited ? 'Remove favorite' : 'Add favorite'}
        >
          <Ionicons
            name={favorited ? 'heart' : 'heart-outline'}
            size={22}
            color={favorited ? '#EF4444' : TEXT_SECONDARY}
          />
        </Pressable>
      </View>
    </View>
  );

  const tabs = (
    <View style={styles.segment}>
      {(['details', 'instructions', 'requirements'] as const).map((k) => (
        <Pressable
          key={k}
          onPress={() => setTab(k)}
          style={[styles.segmentBtn, tab === k && styles.segmentBtnOn]}
        >
          <Text style={[styles.segmentLabel, tab === k && styles.segmentLabelOn]} numberOfLines={1}>
            {k === 'details' ? 'Job Details' : k === 'instructions' ? 'Instructions' : 'Requirements'}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const detailsBody = (
    <>
      {isFull ? (
        <View style={styles.noticeBanner}>
          <Ionicons name="time-outline" size={20} color={PRIMARY} style={styles.noticeIcon} />
          <Text style={styles.noticeText}>
            This job is full, but slots might open soon. Once your requirements are complete, you can join the waitlist
            and be notified if anything opens up.
          </Text>
        </View>
      ) : null}

      <View style={styles.metaCard}>
        <Text style={styles.shiftWhen}>
          {formatShiftDayLine(shift.start_date)}
          {'\n'}
          <Text style={styles.shiftHours}>
            {DEFAULT_SHIFT_HOURS}
            {'\n'}
            <Text style={styles.breakNote}>(1 × 30 min unpaid break)</Text>
          </Text>
        </Text>

        <View style={styles.estRow}>
          <Text style={styles.estLabel}>
            Est. pay / day is {estPerDay != null ? money(estPerDay) : '—'}
          </Text>
          <Pressable onPress={explainEstPay} hitSlop={8} accessibilityLabel="About estimated pay">
            <Ionicons name="information-circle-outline" size={20} color={PRIMARY} />
          </Pressable>
        </View>

        {rate != null ? (
          <View style={styles.ratePill}>
            <Text style={styles.ratePillText}>{money(rate)} / hr</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.bookBtn, bookDisabled && styles.bookBtnDisabled]}
            disabled={bookDisabled}
            onPress={() => !bookDisabled && Alert.alert('Book shift', 'Booking will be available soon.')}
          >
            <Text style={[styles.bookBtnText, bookDisabled && styles.bookBtnTextDisabled]}>Book this shift</Text>
          </Pressable>
          <Pressable style={styles.messageOutlineBtn} onPress={openEmployerChatIntro}>
            <Text style={styles.messageOutlineText}>Message</Text>
          </Pressable>
        </View>
      </View>

      {multi ? (
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleSummaryRow}>
            <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
            <Text style={styles.scheduleSummaryText}>
              {formatRangeShort(shift.start_date, shift.end_date)} ({workdays} workdays)
            </Text>
          </View>
          <Pressable
            style={styles.viewSchedulesBtn}
            onPress={() => router.push(`/shift/${id}/schedules` as const)}
          >
            <Ionicons name="calendar-number-outline" size={20} color={PRIMARY} />
            <Text style={styles.viewSchedulesText}>View job schedules</Text>
          </Pressable>
          <View style={styles.termsBlock}>
            <View style={styles.termsTitleRow}>
              <Ionicons name="document-text-outline" size={18} color={TEXT_PRIMARY} />
              <Text style={styles.termsTitle}>Job Terms</Text>
            </View>
            <Text style={styles.termsBody}>
              This is a long-term engagement with terms that differ from single and multi-day jobs. By accepting this
              long-term engagement, you agree to the additional{' '}
              <Text style={styles.termsLink} onPress={() => Alert.alert('Job Terms', 'Terms content coming soon.')}>
                Job Terms
              </Text>
              .
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable style={styles.detailsRow} onPress={scrollToDetails}>
        <Text style={styles.detailsRowLeft}>Details</Text>
        <View style={styles.detailsRowRight}>
          <Text style={styles.detailsRowHint} numberOfLines={1}>
            Job Details • Instructions • Requirements
          </Text>
          <Ionicons name="chevron-forward" size={18} color={TEXT_SECONDARY} />
        </View>
      </Pressable>

      <View
        style={styles.detailsAnchor}
        onLayout={(e) => {
          detailsY.current = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>About this job</Text>
          {shift.description ? (
            <Text style={styles.detailsCardText}>{shift.description}</Text>
          ) : (
            <Text style={styles.detailsMuted}>No description provided.</Text>
          )}
          {shift.facility?.address ? (
            <>
              <Text style={[styles.detailsCardTitle, { marginTop: 16 }]}>Location</Text>
              <Text style={styles.detailsCardText}>{shift.facility.address}</Text>
            </>
          ) : mapsUrlForFacility(shift.facility) ? (
            <>
              <Text style={[styles.detailsCardTitle, { marginTop: 16 }]}>Location</Text>
              <Text style={styles.detailsCardText}>
                Map pin only (no street address on file). Use Get driving Direction to open maps.
              </Text>
            </>
          ) : null}
          <Text style={[styles.detailsCardTitle, { marginTop: 16 }]}>Requirements</Text>
          {reqs.length > 0 ? (
            reqs.map((r) => (
              <Text key={r.id} style={styles.bullet}>
                • {requirementLineTitle(r)}
              </Text>
            ))
          ) : (
            <Text style={styles.detailsMuted}>No requirements listed.</Text>
          )}
        </View>
      </View>

      <Pressable style={styles.directionsBtn} onPress={() => openDirections(shift)}>
        <Ionicons name="navigate-outline" size={20} color={PRIMARY} />
        <Text style={styles.directionsBtnText}>Get driving Direction</Text>
      </Pressable>

      <View style={{ height: 24 }} />
    </>
  );

  const instructionsBody = (
    <>
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsLead}>Follow these instructions on site and in the app.</Text>
        {shift.description ? (
          <Text style={styles.instructionsBody}>{shift.description}</Text>
        ) : (
          <Text style={styles.detailsMuted}>No instructions have been posted for this job yet.</Text>
        )}
      </View>
      <Pressable style={styles.directionsBtn} onPress={() => openDirections(shift)}>
        <Ionicons name="navigate-outline" size={20} color={PRIMARY} />
        <Text style={styles.directionsBtnText}>Get driving Direction</Text>
      </Pressable>
      <View style={{ height: 24 }} />
    </>
  );

  const requirementsBody = (
    <>
      <View style={styles.accordionCard}>
        <Pressable
          style={styles.accordionHeader}
          onPress={() => setJobReqOpen((o) => !o)}
          accessibilityRole="button"
        >
          <Text style={styles.accordionTitle}>Job Requirements</Text>
          <Ionicons name={jobReqOpen ? 'chevron-up' : 'chevron-down'} size={20} color={TEXT_SECONDARY} />
        </Pressable>
        {jobReqOpen ? (
          <View style={styles.accordionBody}>
            <Text style={styles.reqIntro}>Before accepting this job, you can complete any remaining requirements.</Text>
            {reqs.length > 0 ? (
              reqs.map((r, i) => (
                <View key={r.id}>
                  {i > 0 ? <View style={styles.reqSep} /> : null}
                  <RequirementRow row={r} />
                </View>
              ))
            ) : (
              <Text style={styles.detailsMuted}>No checklist items for this shift yet.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.accordionCard, { marginTop: 12 }]}>
        <Pressable
          style={styles.accordionHeader}
          onPress={() => setClothingOpen((o) => !o)}
          accessibilityRole="button"
        >
          <Text style={styles.accordionTitle}>Clothing Requirements</Text>
          <Ionicons name={clothingOpen ? 'chevron-up' : 'chevron-down'} size={20} color={TEXT_SECONDARY} />
        </Pressable>
        {clothingOpen ? (
          <View style={styles.accordionBody}>
          {clothingSections.wear.length > 0 ? (
            <>
              <Text style={styles.clothingSectionLabel}>WHAT TO WEAR / BRING</Text>
              {clothingSections.wear.map((item) => (
                <View key={item} style={styles.clothingRow}>
                  <Ionicons name="checkmark-circle" size={18} color={GREEN} />
                  <Text style={styles.clothingItem}>{item}</Text>
                </View>
              ))}
            </>
          ) : null}
          {clothingSections.avoid.length > 0 ? (
            <>
              <Text style={[styles.clothingSectionLabel, { marginTop: clothingSections.wear.length ? 14 : 0 }]}>
                WHAT NOT TO WEAR / BRING
              </Text>
              {clothingSections.avoid.map((item) => (
                <View key={item} style={styles.clothingRow}>
                  <Ionicons name="close-circle" size={18} color={RED} />
                  <Text style={styles.clothingItem}>{item}</Text>
                </View>
              ))}
            </>
          ) : null}
          {clothingSections.wear.length === 0 &&
          clothingSections.avoid.length === 0 &&
          clothingSections.credentialHints.length > 0 ? (
            <>
              <Text style={styles.clothingSectionLabel}>CREDENTIALS / GEAR (FROM FACILITY)</Text>
              {clothingSections.credentialHints.map((item) => (
                <View key={item} style={styles.clothingRow}>
                  <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
                  <Text style={styles.clothingItem}>{item}</Text>
                </View>
              ))}
            </>
          ) : null}
          {clothingSections.wear.length === 0 &&
          clothingSections.avoid.length === 0 &&
          clothingSections.credentialHints.length === 0 ? (
            <Text style={styles.detailsMuted}>
              No clothing list is stored for this shift yet. Ask the employer in Messages if you’re unsure what to
              wear.
            </Text>
          ) : null}
        </View>
        ) : null}
      </View>

      <Pressable style={styles.primaryCta} onPress={onCompleteRequirements}>
        <Text style={styles.primaryCtaText}>
          {isFull ? 'Complete requirements and join waitlist' : 'Complete requirements'}
        </Text>
      </Pressable>

      <Pressable style={styles.secondaryCta} onPress={() => openDirections(shift)}>
        <Ionicons name="navigate-outline" size={20} color={PRIMARY} />
        <Text style={styles.secondaryCtaText}>Get driving Direction</Text>
      </Pressable>

      {multi ? (
        <Pressable
          style={[styles.secondaryCta, { marginTop: 10 }]}
          onPress={() => router.push(`/shift/${id}/schedules` as const)}
        >
          <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
          <Text style={styles.secondaryCtaText}>Job Schedules</Text>
        </Pressable>
      ) : null}

      <View style={{ height: 24 }} />
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={24} color={HEADER_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Job Details
        </Text>
        <Pressable onPress={openEmployerChatIntro} style={styles.headerIcon} accessibilityLabel="Messages">
          <Ionicons name="chatbubble-outline" size={22} color={HEADER_BLUE} />
        </Pressable>
      </View>

      {miniCard}
      <View style={styles.tabsWrap}>{tabs}</View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'details' ? detailsBody : null}
        {tab === 'instructions' ? instructionsBody : null}
        {tab === 'requirements' ? requirementsBody : null}
      </ScrollView>

      <Modal
        visible={employerChatOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEmployerChatOpen(false)}
      >
        <Pressable style={styles.employerModalOverlay} onPress={() => setEmployerChatOpen(false)}>
          <Pressable style={styles.employerModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.employerModalHeader}>
              <Text style={styles.employerModalTitle}>Employer Chat</Text>
              <Pressable
                onPress={() => setEmployerChatOpen(false)}
                hitSlop={10}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={TEXT_SECONDARY} />
              </Pressable>
            </View>
            <Text style={styles.employerModalBody}>Click "Get Started" below to begin.</Text>
            <Pressable
              style={({ pressed }) => [styles.employerModalCta, pressed && { opacity: 0.9 }]}
              onPress={confirmEmployerChatAndNavigate}
            >
              <Text style={styles.employerModalCtaText}>Get Started</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <BottomNav active="explore" />
    </SafeAreaView>
  );
}

function requirementLineTitle(r: ShiftRequirementRow): string {
  const t = requirementTypeForShiftReq(r);
  return (t?.name ?? r.description)?.trim() || 'Requirement';
}

function RequirementRow({ row }: { row: ShiftRequirementRow }) {
  const rt = requirementTypeForShiftReq(row);
  const title = rt?.name?.trim() || 'Requirement';
  const desc = row.description?.trim() || DEFAULT_REQ_BLURB;
  const est = formatEstTimeMin(rt?.est_time_min ?? null);

  return (
    <View style={styles.reqRow}>
      <View style={styles.reqRowMain}>
        <Text style={styles.reqTitle}>{title}</Text>
        <Text style={styles.reqDesc}>{desc}</Text>
      </View>
      <View style={styles.reqTime}>
        <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
        <Text style={styles.reqTimeText}>{est}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerIcon: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: HEADER_BLUE },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  miniIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: HEADER_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniText: { flex: 1 },
  miniTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY },
  miniSub: { marginTop: 2, fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500' },
  miniRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabsWrap: { paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  segmentBtnOn: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY, textAlign: 'center' },
  segmentLabelOn: { color: PRIMARY },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BANNER_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER_BLUE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  noticeIcon: { marginTop: 2 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: HEADER_BLUE, fontWeight: '500' },
  metaCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER_BLUE,
    padding: 16,
    marginBottom: 14,
  },
  multiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  multiBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  shiftWhen: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    lineHeight: 22,
  },
  shiftHours: { fontWeight: '600', color: TEXT_PRIMARY },
  breakNote: { fontWeight: '500', color: TEXT_SECONDARY, fontSize: 13 },
  estRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  estLabel: { flex: 1, fontSize: 14, color: TEXT_PRIMARY, fontWeight: '600' },
  ratePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: NAVY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ratePillText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  bookBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookBtnDisabled: { backgroundColor: '#E2E8F0' },
  bookBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bookBtnTextDisabled: { color: '#94A3B8' },
  messageOutlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  messageOutlineText: { color: PRIMARY, fontSize: 14, fontWeight: '700' },
  scheduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  scheduleSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleSummaryText: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  viewSchedulesBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY,
    backgroundColor: '#FFF',
  },
  viewSchedulesText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  termsBlock: { marginTop: 18 },
  termsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  termsTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  termsBody: { fontSize: 13, lineHeight: 20, color: TEXT_SECONDARY },
  termsLink: { color: PRIMARY, fontWeight: '700', textDecorationLine: 'underline' },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  detailsRowLeft: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY },
  detailsRowRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  detailsRowHint: { flexShrink: 1, fontSize: 11, color: TEXT_SECONDARY, textAlign: 'right' },
  detailsAnchor: {},
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
  },
  detailsCardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 8 },
  detailsCardText: { fontSize: 14, lineHeight: 21, color: TEXT_PRIMARY },
  detailsMuted: { fontSize: 14, color: TEXT_SECONDARY, fontStyle: 'italic' },
  bullet: { fontSize: 14, color: TEXT_PRIMARY, marginBottom: 6, lineHeight: 20 },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingVertical: 14,
  },
  directionsBtnText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  err: { fontSize: 16, color: '#B91C1C', textAlign: 'center' },
  link: { color: PRIMARY, fontWeight: '600', fontSize: 16 },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },
  instructionsLead: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 10 },
  instructionsBody: { fontSize: 14, lineHeight: 22, color: TEXT_PRIMARY },
  accordionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  accordionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 14,
    paddingTop: 12,
  },
  reqIntro: { fontSize: 13, lineHeight: 19, color: TEXT_SECONDARY, marginBottom: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reqRowMain: { flex: 1 },
  reqTitle: { fontSize: 15, fontWeight: '800', color: TEXT_PRIMARY },
  reqDesc: { marginTop: 4, fontSize: 13, lineHeight: 19, color: TEXT_SECONDARY },
  reqTime: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  reqTimeText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  reqSep: { height: 1, backgroundColor: BORDER, marginVertical: 14 },
  clothingSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  clothingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  clothingItem: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  primaryCta: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondaryCta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingVertical: 14,
  },
  secondaryCtaText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  employerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  employerModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 22,
    maxWidth: 360,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  employerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employerModalTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY },
  employerModalBody: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: TEXT_SECONDARY,
  },
  employerModalCta: {
    marginTop: 22,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  employerModalCtaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
