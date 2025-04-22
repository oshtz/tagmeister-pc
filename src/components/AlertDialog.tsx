import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';

type AlertDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'error' | 'confirm';
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  okLabel?: string;
};

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  title,
  message,
  type = 'info',
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  okLabel = 'OK'
}) => {
  const isConfirm = type === 'confirm';

  return (
    <Dialog open={open} onClose={onClose}>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        <DialogContentText
          sx={{
            color: type === 'error' ? 'error.main' : 'inherit',
            fontFamily: '"Karla", sans-serif'
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {isConfirm ? (
          <>
            <Button onClick={onClose} color="secondary">
              {cancelLabel}
            </Button>
            <Button
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
              color="primary"
              autoFocus
            >
              {confirmLabel}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} color="primary" autoFocus>
            {okLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;
