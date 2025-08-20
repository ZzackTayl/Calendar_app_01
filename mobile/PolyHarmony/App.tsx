import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { dbHelpers } from './lib/supabase';

function MainApp() {
  const { user, loading, signOut } = useAuth();

  const testDatabaseConnection = async () => {
    try {
      const { data, error } = await dbHelpers.getUserEvents(user?.id || 'test-id');
      if (error) {
        Alert.alert('Database Test', `Error: ${error.message}`);
      } else {
        Alert.alert('Database Test', `Success! Found ${data?.length || 0} events`);
      }
    } catch (err) {
      Alert.alert('Database Test', `Connection test completed. Check console for details.`);
      console.log('Database test result:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PolyHarmony</Text>
      {user ? (
        <View style={styles.userInfo}>
          <Text>Welcome! User ID: {user.id}</Text>
          <Text>Phone: {user.phone_number}</Text>
          <Text>Display Name: {user.display_name || 'Not set'}</Text>
          <Button title="Test Database" onPress={testDatabaseConnection} />
          <Button title="Sign Out" onPress={signOut} />
        </View>
      ) : (
        <View style={styles.authInfo}>
          <Text>Not signed in</Text>
          <Text>Environment check:</Text>
          <Text>Supabase URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</Text>
          <Text>Supabase Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</Text>
          <Button title="Test Database Connection" onPress={testDatabaseConnection} />
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    alignItems: 'center',
    gap: 10,
  },
  authInfo: {
    alignItems: 'center',
    gap: 5,
  },
});
