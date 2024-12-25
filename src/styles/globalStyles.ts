import { StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F2', // Neutral background color
    },
    header: {
        flex: 1, // Reserved space for the header
        zIndex: -1, // Send it to the back
    },
    body: {
        flex: 5, // Reserved space for the body
        zIndex: -1, // Send it to the back
    },
    gradient: {
        flex: 1, // Full size for gradient backgrounds
    },
    content: {
        margin: 20, // General padding around the content
        flex: 1, // Allow content to grow and fill available space
    },
    overlayComponent: {
        position: 'absolute',
        top: '8%', // Adjusted for overlay placement
        left: '5%',
        right: '5%',
        bottom: '3%',
        backgroundColor: '#FFFFFF', // Overlay background
        padding: Math.min(0.05 * width, 20), // Padding for content inside the overlay
        borderRadius: Math.min(0.05 * width, 20), // Rounded corners for aesthetic
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 5,
    },
    title: {
        textAlign: 'center',
        textTransform: 'uppercase',
        fontSize: 22, // Title font size
        marginBottom: 15, // Space below the title
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000', // Black text for visibility
    },
    customButton: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },
});

export default globalStyles;
