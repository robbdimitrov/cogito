import { fail } from "@sveltejs/kit";
import { updateUser } from "$lib/domains/users/api.server";
import { uploadImage } from "$lib/domains/posts/uploads.server";
import { resolveCurrentUser } from "$lib/domains/auth/currentUser.server";
import { apiClient } from "$lib/server/api/client";
import { failFromError } from "$lib/server/api/http";

export const actions = {
  default: async (event) => {
    const { request } = event;
    const userResult = await resolveCurrentUser(
      apiClient(event),
      Boolean(event.cookies.get("session")),
    );
    if (userResult.status !== "authenticated") {
      return fail(401, { error: "Unauthorized" });
    }
    const user = userResult.user;

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const bio = formData.get("bio") as string;

    let profilePhotoKey = formData.get("profilePhotoKey") as string;
    let coverPhotoKey = formData.get("coverPhotoKey") as string;

    const avatarFile = formData.get("avatar") as File | null;
    const coverFile = formData.get("cover") as File | null;

    try {
      if (avatarFile && avatarFile.size > 0) {
        const res = await uploadImage(apiClient(event), avatarFile);
        profilePhotoKey = res.key;
      }

      if (coverFile && coverFile.size > 0) {
        const res = await uploadImage(apiClient(event), coverFile);
        coverPhotoKey = res.key;
      }

      await updateUser(apiClient(event), user.id, {
        name,
        username,
        email,
        bio,
        profilePhotoKey: profilePhotoKey || undefined,
        coverPhotoKey: coverPhotoKey || undefined,
      });

      return { success: true };
    } catch (e) {
      return failFromError(e, "Failed to update profile");
    }
  },
};
