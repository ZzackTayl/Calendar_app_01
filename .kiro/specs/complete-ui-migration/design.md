# Design Document: Complete UI Migration to BLoC

## Overview

This design outlines the approach for migrating the final 3 Riverpod-based screens to BLoC/Cubit state management. All required cubits already exist, so this is purely a UI wiring task following established patterns from the 13 already-migrated screens. The migration will maintain all existing functionality while replacing Riverpod widgets with BLoC equivalents.

## Architecture

### Migration Pattern

```
Riverpod Pattern (OLD)              →    BLoC Pattern (NEW)
├── ConsumerWidget                  →    StatelessWidget
├── ConsumerStatefulWidget          →    StatefulWidget  
├── ref.watch(provider)             →    BlocBuilder<Cubit, State>
├── ref.read(provider)              →    context.read<Cubit>()
├── ref.read(provider.notifier)     →    context.read<Cubit>()
└── ref.listen(provider, callback)  →    BlocListener<Cubit, State>
```

### Cubit Mapping

```
Legacy Provider              →    BLoC Cubit
├── onboardingProvider       →    ContactCubit + AuthCubit
├── settingsControllerProvider →  SettingsCubit
├── userProfileProvider      →    UserProfileCubit
├── calendarListProvider     →    CalendarsCubit
├── eventListProvider        →    EventCubit
└── contactListProvider      →    ContactCubit
```

## Components and Interfaces

### 1. OnboardingScreen Migration

**Current State (Riverpod):**
```dart
class OnboardingScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  Widget build(BuildContext context, WidgetRef ref) {
    final onboardingState = ref.watch(onboardingProvider);
    final onboardingNotifier = ref.read(onboardingProvider.notifier);
    // ...
  }
}
```

**Target State (BLoC):**
```dart
class OnboardingScreen extends StatefulWidget {
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<ContactCubit>()),
        BlocProvider(create: (_) => sl<AuthCubit>()),
      ],
      child: BlocBuilder<ContactCubit, ContactState>(
        builder: (context, contactState) {
          // Use contactState instead of onboardingState
          // Use context.read<ContactCubit>() instead of notifier
        },
      ),
    );
  }
}
```

**Key Changes:**
- Replace `ConsumerStatefulWidget` with `StatefulWidget`
- Wrap with `MultiBlocProvider` for multiple cubits
- Replace `ref.watch(onboardingProvider)` with `BlocBuilder<ContactCubit, ContactState>`
- Replace `ref.read(onboardingProvider.notifier)` with `context.read<ContactCubit>()`
- Map onboarding state fields to contact state fields

**State Mapping:**
```dart
// OLD: onboardingState.contacts
// NEW: contactState.contacts

// OLD: onboardingState.isLoading
// NEW: contactState.status.isLoading

// OLD: onboardingNotifier.addContact(contact)
// NEW: context.read<ContactCubit>().addContact(contact)
```

### 2. SettingsScreen Migration

**Current State (Riverpod):**
```dart
class SettingsScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final controller = ref.read(settingsControllerProvider.notifier);
    final profileAsync = ref.watch(userProfileProvider);
    final calendarsAsync = ref.read(calendarListProvider);
    // ...
  }
}
```

**Target State (BLoC):**
```dart
class SettingsScreen extends StatelessWidget {
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<SettingsCubit>()),
        BlocProvider(create: (_) => sl<UserProfileCubit>()),
        BlocProvider(create: (_) => sl<CalendarsCubit>()..loadCalendars()),
      ],
      child: BlocBuilder<SettingsCubit, SettingsCubitState>(
        builder: (context, settingsState) {
          return BlocBuilder<UserProfileCubit, UserProfileState>(
            builder: (context, profileState) {
              return BlocBuilder<CalendarsCubit, CalendarsState>(
                builder: (context, calendarsState) {
                  // Use states instead of async values
                },
              );
            },
          );
        },
      ),
    );
  }
}
```

**Key Changes:**
- Replace `ConsumerWidget` with `StatelessWidget`
- Wrap with `MultiBlocProvider` for SettingsCubit, UserProfileCubit, CalendarsCubit
- Replace `ref.watch(settingsControllerProvider)` with `BlocBuilder<SettingsCubit, SettingsCubitState>`
- Replace async value handling (`.when()`) with status checking (`.status.isLoading`)
- Replace `controller.updateSetting()` with `context.read<SettingsCubit>().updateSetting()`

**State Mapping:**
```dart
// OLD: settingsAsync.when(data: (settings) => settings.darkModeEnabled)
// NEW: settingsState.settings.darkModeEnabled

// OLD: settingsAsync.when(loading: () => CircularProgressIndicator())
// NEW: if (settingsState.status.isLoading) CircularProgressIndicator()

// OLD: controller.updateDarkMode(value)
// NEW: context.read<SettingsCubit>().updateDarkMode(value)

// OLD: profileAsync.when(data: (profile) => profile.displayName)
// NEW: profileState.profile?.displayName

// OLD: calendarsAsync.when(data: (calendars) => calendars)
// NEW: calendarsState.calendars
```

### 3. EventsScreen Migration

**Current State (Riverpod):**
```dart
class EventsScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventListProvider);
    final settingsAsync = ref.watch(settingsControllerProvider);
    final contactsAsync = ref.watch(contactListProvider);
    // ...
  }
}
```

**Target State (BLoC):**
```dart
class EventsScreen extends StatelessWidget {
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<EventCubit>()..loadEvents()),
        BlocProvider(create: (_) => sl<SettingsCubit>()),
        BlocProvider(create: (_) => sl<ContactCubit>()..loadContacts()),
      ],
      child: BlocBuilder<EventCubit, EventState>(
        builder: (context, eventState) {
          return BlocBuilder<SettingsCubit, SettingsCubitState>(
            builder: (context, settingsState) {
              return BlocBuilder<ContactCubit, ContactState>(
                builder: (context, contactState) {
                  // Use states instead of async values
                },
              );
            },
          );
        },
      ),
    );
  }
}
```

**Key Changes:**
- Replace `ConsumerWidget` with `StatelessWidget`
- Wrap with `MultiBlocProvider` for EventCubit, SettingsCubit, ContactCubit
- Replace `ref.watch(eventListProvider)` with `BlocBuilder<EventCubit, EventState>`
- Replace async value handling with status checking
- Initialize cubits with data loading in `create` callback

**State Mapping:**
```dart
// OLD: eventsAsync.when(data: (events) => events)
// NEW: eventState.events

// OLD: eventsAsync.when(loading: () => CircularProgressIndicator())
// NEW: if (eventState.status.isLoading) CircularProgressIndicator()

// OLD: settingsAsync.maybeWhen(data: (settings) => settings.timeZone)
// NEW: settingsState.settings.timeZone

// OLD: contactsAsync.maybeWhen(data: (contacts) => contacts)
// NEW: contactState.contacts
```

## Data Models

### State Status Handling

**Riverpod AsyncValue Pattern:**
```dart
asyncValue.when(
  data: (value) => SuccessWidget(value),
  loading: () => LoadingWidget(),
  error: (error, stack) => ErrorWidget(error),
)
```

**BLoC AppStateStatus Pattern:**
```dart
if (state.status.isLoading) {
  return LoadingWidget();
}
if (state.status.isFailure) {
  return ErrorWidget(state.message);
}
return SuccessWidget(state.data);
```

### Cubit Method Calls

**Riverpod Notifier Pattern:**
```dart
final notifier = ref.read(provider.notifier);
notifier.updateValue(newValue);
```

**BLoC Context Pattern:**
```dart
context.read<MyCubit>().updateValue(newValue);
```

## Error Handling

### Loading States

**Riverpod:**
- Uses `AsyncValue.loading()`
- Handled in `.when()` callback

**BLoC:**
- Uses `AppStateStatus.loading`
- Checked with `state.status.isLoading`

### Error States

**Riverpod:**
- Uses `AsyncValue.error(error, stackTrace)`
- Handled in `.when()` callback

**BLoC:**
- Uses `AppStateStatus.failure` + `state.message`
- Checked with `state.status.isFailure`
y
r readabiliteded fodgets if neeparate wio sact tn:** Extrtiors
**MitigaocBuildeed Blnestplex *Risk:** Comte

*n comple verificatio untild folderrchivereens in aold scep  Ketion:**
**Mitigaonality functitingaking exisisk:** Brested

**Rare te exist and its alreadyquired cubl re** Alion:
**Mitigatt methodscubiing * Missisk:*

**Rlatess as tempated screensting migrxirence etion:** Refetiga*Mierrors
*apping te m:** Sta

**Risktionigak MitRisation

## nd verific changes aary ofrt** - Summepon rompletioration c*Mig
6. *hived files of arcumentationd** - DocREADME.m_riverpod/archived**s
5. versiong BLoC in- Us** ter.dart_routed appn
4. **UpdantsScreed Eve** - Migraten_bloc.dartscree **events_3.
  ttingsScreented Seigradart** - Mcreen_bloc.s_setting
2. **srdingScreenboaated On* - Migrart*_bloc.deending_scr1. **onboars

erable
## Delivval
mo Riverpod refor ✅ Ready d
-aten updntatioDocumehived
- ✅ ns arc ✅ Old screedated
- Router uprated
- ✅ens migrel 3 scs

- ✅ Altenes Comple
###
gsor warninrrors No runtime etly
- ✅ s correcn workigatio- ✅ Navy
rectltes work corState upda ✅ nts work
-lemective ell intera ✅ At errors
-ithoueens load w- ✅ All scrnality

unctio F
###
rch patterns_CleanAOrbitollows My- ✅ F
ilderer/BlocBuocProviduse Blcreens  sll- ✅ Areens
ctive sc aead intch or ref.rref.wao  ✅ Nns
-active screen age iet usrWidgConsumes/
- ✅ No creen/ui/ss in liblyzer erroro ana
- ✅ Zeruality

### Code Qs Criteria
 Success

##our-7 he:** 5ted Timtal Estimas

**Toissuement any s
4. Docule erroronsoVerify no c
3. screenrated st each mig Tell app
2.1. Run fu)

tes minufication (307: Veriase s

### Phctive screenn ad usage ierpoy no Rivze
4. Verifly flutter ana3. Runod/
ed_riverpto archivdd README 2. Aiverpod/
chived_rarreens to Move old sc

1. inutes)30 mnup (6: Clea## Phase 

#lepil routes comrify al. Vets
4orod imped_riverpe archivRemovt
3. orgScreen impince Onboardeplarts
2. Rt impoarapp_router.d
1. Update 5 minutes)
ter (1pdate Rouse 5: U Pha
###
nd displaying aerent filt
7. Test evlogicdisplay vent . Update echecks
6 status ndling withync value hace aspla. Re (nested)
5erth BlocBuildch wiref.wat
4. Replace sor 3 cubit fviderrotiBlocPd Mul
3. Adsst base cla widgeeplaceart
2. Rreen_bloc.ds_scw evente ne

1. Creatours)n (1-1.5 hsScreevent4: Migrate Ehase ## P

#ionstings optt all set
7. Tescallss update ngall settite 6. Updatus checks
ing with sta value handlplace async
5. Renested)uilder (h with BlocBce ref.watceplas
4. Rr 3 cubitovider foultiBlocPrd Mclass
3. Adbase et  widgcela Repc.dart
2.s_screen_blotting seeate new

1. Crs) (1.5-2 hourgsScreenettinigrate Se 3: M

### Phasynalitest functio
7. Tncesereeld refte fite sta. Updaext.read
6th contref.read wie 
5. Replacderuilh with BlocBce ref.watc
4. ReplalocProviderltiB
3. Add Muase classce widget b. Replat
2oc.dareen_bl_scr onboardingewte nea
1. Crurs)
ho1-1.5 en (boardingScrete One 2: Migra# Phas

##pingsmaptate field  s4. Document to cubits
providers. Map screen
3ach s in eusageider ovntify all pr
2. Idetionsmentaimplescreen  BLoC xistingw e
1. Revieinutes)
0 m Prepare (3e 1:# Phasproach

##ation Apment## Imple

on worksgatify navi
   - Veriates workpdstate u  - Verify elements
 ractive tell inTest ak:**
   -  Checteraction **In

4.rs correctlyrendeI y Urif
   - Vele errorsify no conso- Ver screen
   igrated each me toigat- Nav  
  Check:**avigation

3. **Nos
   ```r run -d mac  flutte`bash
    ``heck:**
me Cnti2. **Ru

s/
   ```een/scr/uie libutter analyz fl  sh
   ```ba
Check:**ompile s

1. **Ction Stepica Verif### works

onatinavigs tail Event det
- [ ]s correce display iimezon] T[ orks
- hting w highligntacts
- [ ] Cong workteri Event fil[ ]rectly
- cordisplays s list nt ] Eve- [s
 erroroads without ] Screen l- [creen:**


**EventsSksworquest t reor ] Data expys
- [ displaformatione inil
- [ ] Profworkggles y tovisibilit Calendar  ] [rks
-n woiozone select- [ ] Timerectly
 update cortingssetPrivacy  ]  works
- [mode togglek - [ ] Darrrors
ithout es w loaden] Scre**
- [ een:ettingsScr
**Satus
boarding stes onn sav ] Completioorks
- [ep w next ston to Navigati[ ]n works
- de selectio mo] Invite- [ on works
t selecti [ ] Contacectly
-plays corrdist tact lis] Conworks
- [ equest rmission rct pe
- [ ] Contaerrorsthout wids Screen loa [ ] reen:**
-gScOnboardin
**Checklist
g stinTe## Manual tegy

#Stra Testing 

##ssct data acceor direuccess` s.isSte.statustaith `ed wata
- Checkate duccess` + sttatus.spStateSses `Ap
- U:**k

**BLoC callbac.when()` in `Handled
- alue)`.data(vValue `Asynces**
- Userpod:
**Rivs States

### Succes