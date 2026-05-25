let calendarInstance = null;
let daysWithData = [];
let onMonthChangeCallback = null;

const el = "#pick-date-field";

export const initCalendar = (onMonthChange) => {
    onMonthChangeCallback = onMonthChange;
    const isRTL =
        typeof KTUtil !== "undefined" &&
        typeof KTUtil.isRTL === "function" &&
        KTUtil.isRTL();

    if (typeof $(el).datepicker !== "function") {
        return;
    }

    let arrows;
    if (isRTL) {
        arrows = {
            leftArrow: '<i class="la la-angle-right"></i>',
            rightArrow: '<i class="la la-angle-left"></i>',
        };
    } else {
        arrows = {
            leftArrow: '<i class="la la-angle-left"></i>',
            rightArrow: '<i class="la la-angle-right"></i>',
        };
    }

    calendarInstance = $(el).datepicker({
        rtl: isRTL,
        todayHighlight: true,
        format: "yyyy-mm-dd",
        autoclose: true,
        templates: arrows,
        language: "pt-PT",
        defaultViewDate: new Date(),
        updateViewDate: false,
        beforeShowDay: function (date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;
            if (daysWithData.includes(dateStr)) {
                return { classes: "has-data-dot" };
            }
            return;
        },
    });

    $(el).on("changeMonth", function (e) {
        const newDate = e.date;
        const firstDayOfMonth = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, "0")}-01`;

        if (onMonthChangeCallback) {
            onMonthChangeCallback(firstDayOfMonth);
        }
    });
};

export const updateCalendar = (data) => {
    daysWithData = data || [];
    if (calendarInstance) calendarInstance.datepicker("update");
};
