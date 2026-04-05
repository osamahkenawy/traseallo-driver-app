/**
 * Trasealla Driver App — Support Store (Zustand)
 */

import {create} from 'zustand';
import {supportApi} from '../api';

const useSupportStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────
  tickets: [],
  ticketsPagination: {page: 1, limit: 20, total: 0, hasMore: true},
  currentTicket: null,
  help: null,
  isLoading: false,
  isLoadingTickets: false,
  isLoadingDetail: false,
  isSubmitting: false,
  isReplying: false,
  error: null,

  // ─── Actions ────────────────────────────────────

  /**
   * Create a support ticket
   */
  createTicket: async data => {
    set({isSubmitting: true, error: null});
    try {
      const res = await supportApi.createTicket(data);
      const body = res.data;
      const ticket = body?.data || body?.ticket || (body?.id ? body : null);
      if (__DEV__) console.log('[SupportStore] createTicket raw:', JSON.stringify(body)?.substring(0, 300));
      set(state => ({
        tickets: [ticket, ...state.tickets],
        isSubmitting: false,
      }));
      return ticket;
    } catch (error) {
      set({
        isSubmitting: false,
        error: error.response?.data?.message || 'Failed to create ticket',
      });
      throw error;
    }
  },

  /**
   * Report an issue (quick report)
   */
  reportIssue: async data => {
    set({isSubmitting: true, error: null});
    try {
      const res = await supportApi.reportIssue(data);
      set({isSubmitting: false});
      return res.data?.data || res.data;
    } catch (error) {
      set({
        isSubmitting: false,
        error: error.response?.data?.message || 'Failed to report issue',
      });
      throw error;
    }
  },

  /**
   * Fetch support tickets (paginated)
   */
  fetchTickets: async (params = {}) => {
    const {ticketsPagination} = get();
    const page = params.page || ticketsPagination.page;
    const limit = params.limit || ticketsPagination.limit;

    set({isLoadingTickets: true});
    try {
      const res = await supportApi.getTickets({page, limit, ...params});
      const body = res.data;
      const items = Array.isArray(body?.data) ? body.data : (body?.data?.tickets || body?.data?.items || []);
      const total = body?.pagination?.total || body?.data?.total || 0;

      set(state => ({
        tickets: page === 1 ? items : [...state.tickets, ...items],
        ticketsPagination: {page, limit, total, hasMore: items.length === limit},
        isLoadingTickets: false,
      }));
      return items;
    } catch (error) {
      set({isLoadingTickets: false});
      if (__DEV__) console.warn('[SupportStore] fetchTickets error:', error?.message);
      return null;
    }
  },

  /**
   * Load next page of tickets
   */
  loadMoreTickets: async () => {
    const {ticketsPagination, isLoadingTickets} = get();
    if (isLoadingTickets || !ticketsPagination.hasMore) return;
    return get().fetchTickets({page: ticketsPagination.page + 1});
  },

  /**
   * Fetch help / FAQ content
   */
  fetchHelp: async () => {
    set({isLoading: true, error: null});
    try {
      const res = await supportApi.getHelp();
      const data = res.data?.data || res.data;
      set({help: data || null, isLoading: false, error: null});
      return data;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to load help',
      });
      return null;
    }
  },

  /**
   * Fetch single ticket detail with replies
   */
  fetchTicketDetail: async (id) => {
    set({isLoadingDetail: true, error: null, currentTicket: null});
    try {
      const res = await supportApi.getTicketDetail(id);
      const body = res.data;
      // Try multiple extraction paths
      const ticket = body?.data || body?.ticket || (body?.id ? body : null);
      if (__DEV__) console.log('[SupportStore] ticketDetail raw:', JSON.stringify(body)?.substring(0, 300));
      set({currentTicket: ticket, isLoadingDetail: false});
      return ticket;
    } catch (error) {
      if (__DEV__) console.warn('[SupportStore] fetchTicketDetail error:', error?.message);
      set({isLoadingDetail: false, error: error.response?.data?.message || 'Failed to load ticket'});
      return null;
    }
  },

  /**
   * Reply to a support ticket
   */
  replyToTicket: async (id, message) => {
    set({isReplying: true, error: null});
    try {
      const res = await supportApi.replyToTicket(id, {message});
      const reply = res.data?.data || res.data;
      set(state => {
        const ct = state.currentTicket;
        if (ct && ct.id === id) {
          const replies = Array.isArray(ct.replies) ? [...ct.replies, reply] : [reply];
          return {currentTicket: {...ct, replies}, isReplying: false};
        }
        return {isReplying: false};
      });
      return reply;
    } catch (error) {
      set({isReplying: false, error: error.response?.data?.message || 'Failed to send reply'});
      throw error;
    }
  },

  /**
   * Reset tickets state
   */
  resetTickets: () =>
    set({
      tickets: [],
      ticketsPagination: {page: 1, limit: 20, total: 0, hasMore: true},
    }),
}));

export default useSupportStore;
