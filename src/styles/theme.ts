// theme.js or theme.ts
import { Theme } from '@aws-amplify/ui-react-native';

const customTheme: Theme = {
  components: {
    button: {
      containerPrimary: {
        backgroundColor: '#4C58D0', // Filled button background color
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20, // Curved corners
        alignItems: 'center',
        justifyContent: 'center',
      },
      textPrimary: {
        color: '#FFFFFF', // White text color for filled button
        fontSize: 16,
        fontWeight: 'bold',
      },
      containerDefault: {
        // Default style if you want to set a different style for other buttons (optional)
      },
      textDefault: {
        // Default text style if you want to apply it for non-primary buttons (optional)
      },
    },
  },
};

export default customTheme;
