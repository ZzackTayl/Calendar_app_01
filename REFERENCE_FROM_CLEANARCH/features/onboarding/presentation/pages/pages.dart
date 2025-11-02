import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:myorbit_calender/core/config/config.dart';
import 'package:myorbit_calender/core/shared_widget/custom_scaffold.dart';
import 'package:myorbit_calender/core/shared_widget/widgets.dart';
import 'package:myorbit_calender/core/theme/theme.dart';
import 'package:myorbit_calender/features/onboarding/data/model/model.dart';
import 'package:myorbit_calender/features/onboarding/presentation/cubit/cubit.dart';
import 'package:myorbit_calender/features/onboarding/presentation/widgets/widgets.dart'
    hide ProgressIndicator;

part 'calender_sync_page.dart';
part 'contact_import_page.dart';
part 'onboarding_page.dart';
part 'permission_intro_page.dart';
part 'welcome_page.dart';
