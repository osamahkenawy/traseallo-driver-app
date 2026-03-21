/**
 * Ratings Screen — Driver ratings and reviews from API
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../../utils/LucideIcon';
import {colors} from '../../theme/colors';
import {fontFamily} from '../../theme/fonts';
import {authApi} from '../../api';

const RatingsScreen = ({navigation}) => {
  const ins = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingsData, setRatingsData] = useState(null);
  const [reviews, setReviews] = useState([]);

  const fetchRatings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await authApi.getProfile();
      const data = res.data?.data || res.data;
      setRatingsData(data);
      const reviewsArr = Array.isArray(data?.reviews) ? data.reviews
        : Array.isArray(data?.ratings) ? data.ratings
        : [];
      setReviews(reviewsArr);
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRatings(true);
  };

  // Compute star distribution
  const avg = Number(ratingsData?.average_rating || ratingsData?.averageRating || 0);
  const total = Number(ratingsData?.total_ratings || ratingsData?.totalRatings || reviews.length || 0);
  const dist = ratingsData?.distribution || {};

  const bars = [5, 4, 3, 2, 1].map(star => {
    const count = Number(dist[star] || dist[`star_${star}`] || 0);
    const pct = total > 0 ? (count / total) * 100 : 0;
    return {label: String(star), pct, count};
  });

  const StarIcons = ({rating}) => (
    <View style={{flexDirection: 'row', gap: 2}}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={12}
          color={colors.warning}
        />
      ))}
    </View>
  );

  const renderReview = (item, idx) => (
    <View key={item.id || idx}>
      {idx > 0 && <View style={s.reviewSep} />}
      <View style={s.reviewRow}>
        <View style={s.reviewAvatar}>
          <Text style={s.reviewAvatarTxt}>
            {(item.customer_name || item.reviewer_name || 'C').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <View style={s.reviewTop}>
            <Text style={s.reviewName} numberOfLines={1}>
              {item.customer_name || item.reviewer_name || 'Customer'}
            </Text>
            <StarIcons rating={item.rating} />
          </View>
          {item.comment || item.review ? (
            <Text style={s.reviewComment}>{item.comment || item.review}</Text>
          ) : null}
          <Text style={s.reviewDate}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('en-AE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  // Determine delivery stats from ratingsData or fallback
  const deliveries = ratingsData?.total_deliveries || ratingsData?.totalDeliveries || 0;
  const onTimeRate = ratingsData?.on_time_rate || ratingsData?.onTimeRate || null;
  const positiveRate = total > 0
    ? Math.round(((Number(dist[4] || 0) + Number(dist[5] || 0)) / total) * 100)
    : 0;

  return (
    <View style={[s.root, {paddingTop: ins.top}]}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Ratings</Text>
        <View style={{width: 20}} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {loading ? (
          <View style={{paddingTop: 80, alignItems: 'center'}}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Overall Rating Card */}
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.scoreCol}>
                  <Text style={s.bigScore}>{avg.toFixed(1)}</Text>
                  <View style={s.starsRow}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Icon
                        key={i}
                        name={i <= Math.round(avg) ? 'star' : 'star-outline'}
                        size={16}
                        color={colors.warning}
                      />
                    ))}
                  </View>
                  <Text style={s.ratingCount}>{total} rating{total !== 1 ? 's' : ''}</Text>
                </View>
                <View style={s.barsCol}>
                  {bars.map(b => (
                    <View key={b.label} style={s.barRow}>
                      <Text style={s.barLabel}>{b.label}</Text>
                      <Icon name="star" size={10} color={colors.warning} />
                      <View style={s.barTrack}>
                        <View style={[s.barFill, {width: `${b.pct}%`}]} />
                      </View>
                      <Text style={s.barCount}>{b.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Performance Badges */}
            <Text style={s.secTitle}>Performance</Text>
            <View style={s.badgesRow}>
              <View style={s.badge}>
                <View style={[s.badgeIcon, {backgroundColor: colors.success + '12'}]}>
                  <Icon name="clock-fast" size={18} color={colors.success} />
                </View>
                <Text style={s.badgeValue}>
                  {onTimeRate != null ? `${Math.round(onTimeRate)}%` : '—'}
                </Text>
                <Text style={s.badgeLabel}>On Time</Text>
              </View>
              <View style={s.badge}>
                <View style={[s.badgeIcon, {backgroundColor: colors.info + '12'}]}>
                  <Icon name="thumb-up-outline" size={18} color={colors.info} />
                </View>
                <Text style={s.badgeValue}>
                  {total > 0 ? `${positiveRate}%` : '—'}
                </Text>
                <Text style={s.badgeLabel}>Positive</Text>
              </View>
              <View style={s.badge}>
                <View style={[s.badgeIcon, {backgroundColor: colors.primary + '12'}]}>
                  <Icon name="package-variant" size={18} color={colors.primary} />
                </View>
                <Text style={s.badgeValue}>{deliveries}</Text>
                <Text style={s.badgeLabel}>Deliveries</Text>
              </View>
            </View>

            {/* Reviews */}
            <Text style={s.secTitle}>Recent Reviews</Text>
            {reviews.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIcWrap}>
                  <Icon name="star-check-outline" size={28} color={colors.textMuted} />
                </View>
                <Text style={s.emptyTitle}>No reviews yet</Text>
                <Text style={s.emptySub}>
                  Customer reviews will appear here once{'\n'}you complete deliveries.
                </Text>
              </View>
            ) : (
              <View style={s.reviewsCard}>
                {reviews.map(renderReview)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F5F7FA'},
  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 52,
  },
  hdrTitle: {fontFamily: fontFamily.bold, fontSize: 16, color: colors.textPrimary},
  scroll: {paddingHorizontal: 20, paddingBottom: 40},

  /* Overall Card */
  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5',
    padding: 20, marginBottom: 10,
  },
  cardTop: {flexDirection: 'row'},
  scoreCol: {alignItems: 'center', marginRight: 24},
  bigScore: {fontFamily: fontFamily.bold, fontSize: 44, color: colors.textPrimary, lineHeight: 50},
  starsRow: {flexDirection: 'row', gap: 3, marginTop: 4},
  ratingCount: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, marginTop: 4},
  barsCol: {flex: 1, justifyContent: 'center', gap: 5},
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 4},
  barLabel: {fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary, width: 10, textAlign: 'right'},
  barTrack: {flex: 1, height: 6, backgroundColor: '#EEF1F5', borderRadius: 3, overflow: 'hidden'},
  barFill: {height: 6, backgroundColor: colors.warning, borderRadius: 3},
  barCount: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, width: 20, textAlign: 'right'},

  /* Performance Badges */
  secTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary, marginTop: 20, marginBottom: 10},
  badgesRow: {flexDirection: 'row', gap: 10},
  badge: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5',
    paddingVertical: 16, alignItems: 'center',
  },
  badgeIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  badgeValue: {fontFamily: fontFamily.bold, fontSize: 18, color: colors.textPrimary},
  badgeLabel: {fontFamily: fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 2},

  /* Reviews */
  reviewsCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5', padding: 16,
  },
  reviewRow: {flexDirection: 'row', gap: 12, paddingVertical: 6},
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  reviewAvatarTxt: {fontFamily: fontFamily.bold, fontSize: 14, color: colors.primary},
  reviewTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  reviewName: {fontFamily: fontFamily.medium, fontSize: 13, color: colors.textPrimary, flex: 1, marginRight: 8},
  reviewComment: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 17},
  reviewDate: {fontFamily: fontFamily.regular, fontSize: 10, color: colors.textMuted, marginTop: 4},
  reviewSep: {height: 1, backgroundColor: '#EEF1F5', marginVertical: 4},

  /* Empty */
  emptyCard: {
    backgroundColor: '#FFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF1F5',
    paddingVertical: 40, alignItems: 'center',
  },
  emptyIcWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  emptyTitle: {fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.textPrimary},
  emptySub: {fontFamily: fontFamily.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18},
});

export default RatingsScreen;
