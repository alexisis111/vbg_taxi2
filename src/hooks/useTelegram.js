const tg = window.Telegram.WebApp;

export function useTelegram() {

    const onClose = () => {
        tg.close()
    }

    const onToggleButton = () => {
        if(tg.MainButton.isVisible) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.show();
        }
    }

    return {
        onClose,
        onToggleButton,
        tg,
        user: tg.initDataUnsafe?.user?.first_name,
        queryId: tg.initDataUnsafe?.query_id,
        userId: tg.initDataUnsafe?.user?.id
    }
}
