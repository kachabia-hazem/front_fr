interface Google {
  accounts: {
    id: {
      initialize(config: GoogleIdConfig): void;
      renderButton(element: HTMLElement, config: GoogleButtonConfig): void;
      prompt(): void;
    };
  };
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

declare var google: Google;
