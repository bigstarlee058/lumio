'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { api } from '@/app/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useId, useState } from 'react';
import toast from 'react-hot-toast';
import { AVAILABLE_BACKGROUNDS } from '../constants';
import { BackgroundSelector } from './BackgroundSelector';
import { CurrencySelector } from './CurrencySelector';
import { ServiceIntegrationSuggestions } from './ServiceIntegrationSuggestions';

type WorkspaceCreatePayload = {
  name: string;
  description?: string;
  backgroundImage: string | null;
  currency: string | null;
};

const getApiMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const response = (error as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
};

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();
  const dialogTitleId = useId();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(
    AVAILABLE_BACKGROUNDS[0],
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [currencyDrawerOpen, setCurrencyDrawerOpen] = useState(false);

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleCreateWorkspace = async () => {
    if (!name.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    try {
      setLoading(true);
      const payload: WorkspaceCreatePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        backgroundImage: selectedBackground,
        currency: selectedCurrency,
      };
      // Do not send icon — icons/emoji feature removed
      const response = await api.post('/workspaces', payload);

      setCreatedWorkspaceId(response.data.id);
      toast.success('Workspace created successfully');
      return response.data.id;
    } catch (error: unknown) {
      toast.error(getApiMessage(error, 'Failed to create workspace'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const finalizeWorkspaceCreation = async () => {
    try {
      const workspaceId = await handleCreateWorkspace();
      if (workspaceId) {
        await switchWorkspace(workspaceId);
        await refreshWorkspaces();
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (error) {
      // Error already handled in handleCreateWorkspace
    }
  };

  const handleFinishFromStep2 = async () => {
    await finalizeWorkspaceCreation();
  };

  const handleProceedToStep3 = () => {
    setStep(3);
  };

  const handleSkipIntegrations = async () => {
    await finalizeWorkspaceCreation();
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedIcon(null);
    setSelectedBackground(AVAILABLE_BACKGROUNDS[0]);
    setSelectedCurrency(null);
    setCreatedWorkspaceId(null);
    setCurrencyDrawerOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    return () => {};
  }, [isOpen]);

  // Emoji picker removed — no-op effect kept intentionally for compatibility
  useEffect(() => {
    // feature removed: icons/emoji selection is disabled
  }, [isOpen]);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ px: 4, pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--primary)' }}
            >
              Workspace setup
            </Typography>
            <Box>
              <Typography id={dialogTitleId} variant="h5" fontWeight={600} style={{ color: '#111827' }}>
                Create New Workspace
              </Typography>
              <Typography variant="body2" style={{ color: '#6b7280' }}>
                Create a dedicated space for your documents, receipts, and reports.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
              <Typography variant="body2" style={{ color: '#9ca3af' }}>Step {step} of 3</Typography>
              <nav aria-label="Workspace setup steps" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { id: 1, label: 'Basic Info' },
                  { id: 2, label: 'Customization' },
                  { id: 3, label: 'Integrations' },
                ].map(item => (
                  <Box
                    key={item.id}
                    sx={{
                      border: item.id === step ? '1px solid var(--primary)' : '1px solid #e5e7eb',
                      px: 1.5,
                      py: 0.5,
                      fontSize: 12,
                      fontWeight: 600,
                      color: item.id === step ? 'var(--primary)' : '#6b7280',
                      bgcolor: item.id === step ? 'rgba(var(--primary-rgb,99,102,241),0.1)' : 'transparent',
                    }}
                    aria-current={item.id === step ? 'step' : undefined}
                  >
                    {item.label}
                  </Box>
                ))}
              </nav>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 4, py: 4 }}>
          {step === 1 && (
            <Stack spacing={3}>
              <TextField
                label="Workspace Name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Workspace"
                inputProps={{ maxLength: 255 }}
                fullWidth
              />
              <TextField
                label="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this workspace for?"
                inputProps={{ maxLength: 500 }}
                multiline
                minRows={4}
                fullWidth
              />
              {/* Icon selection removed — feature not used. */}
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={4}>
              <CurrencySelector
                selectedCurrency={selectedCurrency}
                onSelect={setSelectedCurrency}
                mode="inline"
                open={false}
                onOpenChange={nextOpen => {
                  if (nextOpen) {
                    setCurrencyDrawerOpen(true);
                  }
                }}
              />

              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5, color: '#374151' }}>
                  Background Image
                </Typography>
                <BackgroundSelector
                  selectedBackground={selectedBackground}
                  onSelect={setSelectedBackground}
                  backgrounds={AVAILABLE_BACKGROUNDS}
                />
              </Box>
            </Stack>
          )}

          {step === 3 && (
            <ServiceIntegrationSuggestions
              workspaceId={createdWorkspaceId ?? ''}
              onSkip={handleSkipIntegrations}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 3, justifyContent: 'space-between' }}>
          <Box>
            {step > 1 && (
              <Button type="button" variant="outlined" onClick={handleBack} startIcon={<ChevronLeft size={16} />}>
                Back
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {step === 1 && (
              <Button type="button" variant="contained" onClick={handleNext} endIcon={<ChevronRight size={16} />}>
                Next
              </Button>
            )}

            {step === 2 && (
              <>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleFinishFromStep2}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Skip Integrations'}
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  onClick={handleProceedToStep3}
                  disabled={loading}
                  endIcon={!loading ? <ChevronRight size={16} /> : undefined}
                >
                  {loading ? 'Creating...' : 'Next'}
                </Button>
              </>
            )}
          </Box>
        </DialogActions>
      </Dialog>
      <DrawerShell
        isOpen={isOpen && step === 2 && currencyDrawerOpen}
        onClose={() => setCurrencyDrawerOpen(false)}
        position="right"
        width="lg"
        showCloseButton={false}
        className="max-w-full border-l-0 bg-card sm:max-w-lg"
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <button
              type="button"
              onClick={() => setCurrencyDrawerOpen(false)}
              style={{ borderRadius: '50%', padding: 8, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Close currency drawer"
            >
              <ChevronLeft size={20} />
            </button>
            <Typography variant="h6" fontWeight={600} sx={{ color: 'var(--foreground)' }}>
              Select a currency
            </Typography>
          </Box>
        }
      >
        <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onSelect={currency => {
                setSelectedCurrency(currency);
                setCurrencyDrawerOpen(false);
              }}
              mode="inline"
              open
              showLabel={false}
              showTrigger={false}
              title="Select a currency"
              minimal={false}
              showPanelHeader={false}
            />
          </Box>
        </Box>
      </DrawerShell>
    </>
  );
}
