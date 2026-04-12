'use client';

import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { useWorkspace } from '@/app/contexts/WorkspaceContext';
import { api } from '@/app/lib/api';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
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
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Workspace setup
            </div>
            <div>
              <h2 id={dialogTitleId} className="text-2xl font-semibold text-gray-900">
                Create New Workspace
              </h2>
              <p className="text-sm text-gray-500">
                Create a dedicated space for your documents, receipts, and reports.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-400">Step {step} of 3</div>
              <nav aria-label="Workspace setup steps" className="flex flex-wrap gap-2">
                {[
                  { id: 1, label: 'Basic Info' },
                  { id: 2, label: 'Customization' },
                  { id: 3, label: 'Integrations' },
                ].map(item => (
                  <div
                    key={item.id}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      item.id === step
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 text-gray-500'
                    }`}
                    aria-current={item.id === step ? 'step' : undefined}
                  >
                    {item.label}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 4, py: 4 }}>
          {step === 1 && (
            <div className="space-y-6">
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
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

              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">Background Image</p>
                <BackgroundSelector
                  selectedBackground={selectedBackground}
                  onSelect={setSelectedBackground}
                  backgrounds={AVAILABLE_BACKGROUNDS}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <ServiceIntegrationSuggestions
              workspaceId={createdWorkspaceId ?? ''}
              onSkip={handleSkipIntegrations}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 3, justifyContent: 'space-between' }}>
          <div>
            {step > 1 && (
              <Button type="button" variant="outlined" onClick={handleBack} startIcon={<ChevronLeft size={16} />}>
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
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
          </div>
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrencyDrawerOpen(false)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close currency drawer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-lg font-semibold text-foreground">Select a currency</span>
          </div>
        }
      >
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto pb-4">
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
          </div>
        </div>
      </DrawerShell>
    </>
  );
}
