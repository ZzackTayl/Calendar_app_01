import Flutter
import UIKit
import EventKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let eventStore = EKEventStore()
  private let calendarChannel = "com.myorbit/apple_calendar"
  
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    
    // Set up Apple Calendar platform channel
    if let controller = window?.rootViewController as? FlutterViewController {
      let channel = FlutterMethodChannel(name: calendarChannel, binaryMessenger: controller.binaryMessenger)
      channel.setMethodCallHandler { [weak self] (call: FlutterMethodCall, result: @escaping FlutterResult) in
        self?.handleCalendarMethodCall(call: call, result: result)
      }
    }
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  private func handleCalendarMethodCall(call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "requestPermissions":
      requestCalendarPermissions(result: result)
    case "hasPermissions":
      checkCalendarPermissions(result: result)
    case "getCalendars":
      getCalendars(result: result)
    case "getEvents":
      if let args = call.arguments as? [String: Any] {
        getEvents(args: args, result: result)
      } else {
        result(FlutterError(code: "INVALID_ARGS", message: "Invalid arguments", details: nil))
      }
    default:
      result(FlutterMethodNotImplemented)
    }
  }
  
  private func requestCalendarPermissions(result: @escaping FlutterResult) {
    if #available(iOS 17.0, *) {
      eventStore.requestFullAccessToEvents { granted, error in
        DispatchQueue.main.async {
          if let error = error {
            result(FlutterError(code: "PERMISSION_ERROR", message: error.localizedDescription, details: nil))
          } else {
            result(granted)
          }
        }
      }
    } else {
      eventStore.requestAccess(to: .event) { granted, error in
        DispatchQueue.main.async {
          if let error = error {
            result(FlutterError(code: "PERMISSION_ERROR", message: error.localizedDescription, details: nil))
          } else {
            result(granted)
          }
        }
      }
    }
  }
  
  private func checkCalendarPermissions(result: @escaping FlutterResult) {
    if #available(iOS 17.0, *) {
      let status = EKEventStore.authorizationStatus(for: .event)
      result(status == .fullAccess)
    } else {
      let status = EKEventStore.authorizationStatus(for: .event)
      result(status == .authorized)
    }
  }
  
  private func getCalendars(result: @escaping FlutterResult) {
    let calendars = eventStore.calendars(for: .event)
    let calendarData = calendars.map { calendar -> [String: Any] in
      return [
        "id": calendar.calendarIdentifier,
        "name": calendar.title,
        "color": calendar.cgColor?.components?.first != nil ? 0 : 0, // Simplified color handling
        "isDefault": calendar.isImmutable ? false : true
      ]
    }
    result(calendarData)
  }
  
  private func getEvents(args: [String: Any], result: @escaping FlutterResult) {
    guard let startDateString = args["startDate"] as? String,
          let endDateString = args["endDate"] as? String else {
      result(FlutterError(code: "INVALID_ARGS", message: "Missing date parameters", details: nil))
      return
    }
    
    let dateFormatter = ISO8601DateFormatter()
    guard let startDate = dateFormatter.date(from: startDateString),
          let endDate = dateFormatter.date(from: endDateString) else {
      result(FlutterError(code: "INVALID_DATE", message: "Invalid date format", details: nil))
      return
    }
    
    // Get specific calendar or all calendars
    var calendars: [EKCalendar]?
    if let calendarId = args["calendarId"] as? String {
      if let calendar = eventStore.calendar(withIdentifier: calendarId) {
        calendars = [calendar]
      }
    }
    
    let predicate = eventStore.predicateForEvents(
      withStart: startDate,
      end: endDate,
      calendars: calendars
    )
    
    let events = eventStore.events(matching: predicate)
    let eventsData = events.map { event -> [String: Any?] in
      return [
        "id": event.eventIdentifier,
        "title": event.title,
        "description": event.notes,
        "start": dateFormatter.string(from: event.startDate),
        "end": dateFormatter.string(from: event.endDate),
        "isAllDay": event.isAllDay,
        "location": event.location
      ]
    }
    
    result(eventsData)
  }
}
