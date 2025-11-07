import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProjectInvitation, InvitationStatus, UserCategory } from "../types/buildtrack";

interface InvitationStore {
  invitations: ProjectInvitation[];
  isLoading: boolean;

  // Invitation management
  sendInvitation: (
    projectId: string,
    invitedBy: string,
    invitedByCompanyId: string,
    contact: { email?: string; phone?: string },
    proposedCategory: UserCategory,
    message?: string
  ) => string;
  
  acceptInvitation: (invitationId: string, userId: string) => boolean;
  declineInvitation: (invitationId: string, reason?: string) => boolean;
  
  // Queries
  getInvitationById: (id: string) => ProjectInvitation | undefined;
  getInvitationsByProject: (projectId: string) => ProjectInvitation[];
  getInvitationsByUser: (email?: string, phone?: string) => ProjectInvitation[];
  getPendingInvitations: (email?: string, phone?: string) => ProjectInvitation[];
  
  // Admin actions
  cancelInvitation: (invitationId: string) => boolean;
  resendInvitation: (invitationId: string) => boolean;
}

export const useInvitationStore = create<InvitationStore>()(
  persist(
    (set, get) => ({
      invitations: [],
      isLoading: false,

      sendInvitation: (projectId, invitedBy, invitedByCompanyId, contact, proposedCategory, message) => {
        if (!contact.email && !contact.phone) {
          throw new Error("Either email or phone must be provided");
        }

        const newInvitation: ProjectInvitation = {
          id: `inv-${Date.now()}`,
          projectId,
          invitedBy,
          invitedByCompanyId,
          inviteeEmail: contact.email,
          inviteePhone: contact.phone,
          status: "pending",
          proposedCategory,
          message,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };

        set(state => ({
          invitations: [...state.invitations, newInvitation]
        }));

        return newInvitation.id;
      },

      acceptInvitation: (invitationId, userId) => {
        const invitation = get().invitations.find(inv => inv.id === invitationId);
        
        if (!invitation) return false;
        if (invitation.status !== "pending") return false;
        if (new Date(invitation.expiresAt) < new Date()) {
          // Mark as expired
          set(state => ({
            invitations: state.invitations.map(inv =>
              inv.id === invitationId
                ? { ...inv, status: "expired" as InvitationStatus }
                : inv
            )
          }));
          return false;
        }

        set(state => ({
          invitations: state.invitations.map(inv =>
            inv.id === invitationId
              ? {
                  ...inv,
                  status: "accepted" as InvitationStatus,
                  inviteeUserId: userId,
                  respondedAt: new Date().toISOString(),
                }
              : inv
          )
        }));

        return true;
      },

      declineInvitation: (invitationId, reason) => {
        const invitation = get().invitations.find(inv => inv.id === invitationId);
        
        if (!invitation) return false;
        if (invitation.status !== "pending") return false;

        set(state => ({
          invitations: state.invitations.map(inv =>
            inv.id === invitationId
              ? {
                  ...inv,
                  status: "declined" as InvitationStatus,
                  declineReason: reason,
                  respondedAt: new Date().toISOString(),
                }
              : inv
          )
        }));

        return true;
      },

      getInvitationById: (id) => {
        return get().invitations.find(inv => inv.id === id);
      },

      getInvitationsByProject: (projectId) => {
        return get().invitations.filter(inv => inv.projectId === projectId);
      },

      getInvitationsByUser: (email, phone) => {
        return get().invitations.filter(inv => {
          if (email && inv.inviteeEmail?.toLowerCase() === email.toLowerCase()) return true;
          if (phone && inv.inviteePhone === phone) return true;
          return false;
        });
      },

      getPendingInvitations: (email, phone) => {
        const now = new Date();
        return get().invitations.filter(inv => {
          if (inv.status !== "pending") return false;
          if (new Date(inv.expiresAt) < now) return false;
          
          if (email && inv.inviteeEmail?.toLowerCase() === email.toLowerCase()) return true;
          if (phone && inv.inviteePhone === phone) return true;
          return false;
        });
      },

      cancelInvitation: (invitationId) => {
        const invitation = get().invitations.find(inv => inv.id === invitationId);
        
        if (!invitation) return false;
        if (invitation.status !== "pending") return false;

        set(state => ({
          invitations: state.invitations.map(inv =>
            inv.id === invitationId
              ? { ...inv, status: "expired" as InvitationStatus }
              : inv
          )
        }));

        return true;
      },

      resendInvitation: (invitationId) => {
        const invitation = get().invitations.find(inv => inv.id === invitationId);
        
        if (!invitation) return false;

        set(state => ({
          invitations: state.invitations.map(inv =>
            inv.id === invitationId
              ? {
                  ...inv,
                  status: "pending" as InvitationStatus,
                  createdAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  respondedAt: undefined,
                  declineReason: undefined,
                }
              : inv
          )
        }));

        return true;
      },
    }),
    {
      name: "buildtrack-invitations",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        invitations: state.invitations,
      }),
    }
  )
);