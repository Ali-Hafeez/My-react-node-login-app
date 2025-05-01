// src/components/LoadingSpinner.jsx
import React from 'react';
import { Box, CircularProgress, Typography, Fade, Grow } from '@mui/material';

export default function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Fade in timeout={600}>
        <Grow in timeout={800}>
          <CircularProgress
            size={64}
            thickness={4}
            color="primary"
            sx={{
              filter: 'drop-shadow(0 0 4px rgba(13, 71, 161, 0.6))',
            }}
          />
        </Grow>
      </Fade>
      <Fade in timeout={1200}>
        <Typography
          variant="h6"
          color="textSecondary"
          sx={{ mt: 3, opacity: 0.8 }}
        >
          {message}
        </Typography>
      </Fade>
    </Box>
  );
}
